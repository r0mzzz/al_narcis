import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { AppError } from '../../common/errors';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { MailService } from '../../services/mail.service';
import { Status } from '../../common/status';
import { Messages } from '../../common/messages';
import { RedisService } from '../../services/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  async signUp(createUserDto: CreateUserDto): Promise<any> {
    const userExists = await this.usersService.findByEmail(createUserDto.email);
    if (userExists) {
      throw new BadRequestException(AppError.USER_EXISTS);
    }

    const hash = await this.hashData(createUserDto.password);
    const newUser = await this.usersService.create({
      ...createUserDto,
      password: hash,
    });
    const tokens = await this.getTokens(newUser._id);
    await this.updateRefreshToken(newUser._id, tokens.refresh_token);
    return tokens;
  }

  async signIn(data: LoginUserDto) {
    const user = await this.usersService.findByEmailWithPassword(data.email);
    if (!user) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) throw new BadRequestException(AppError.WRONG_DATA);
    const tokens = await this.getTokens(user._id);
    await this.updateRefreshToken(user._id, tokens.refresh_token);
    return tokens;
  }

  async resetPassword(data: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    await this.mailService.sendResetPasswordEmail(data.email);
    return {
      status: Status.PENDING,
      message: Messages.MAIL_SENT,
    };
  }

  async logout(userId: string) {
    return this.usersService.update(userId, { refresh_token: null });
  }

  hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    this.logger.debug(`Attempting refresh for userId: ${userId}`);
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn(`User not found for userId: ${userId}`);
      throw new ForbiddenException('User not found');
    }
    if (!user.refresh_token) {
      this.logger.warn(`No refresh token stored for userId: ${userId}`);
      throw new ForbiddenException('No refresh token stored');
    }
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refresh_token,
    );
    if (!refreshTokenMatches) {
      this.logger.warn(`Refresh token mismatch for userId: ${userId}`);
      throw new ForbiddenException('Invalid refresh token');
    }
    this.logger.debug(`Refresh token valid for userId: ${userId}`);
    const access_token = await this.jwtService.signAsync(
      {
        sub: user.id,
      },
      {
        secret: this.configService.get('access_secret'),
        expiresIn: this.configService.get('access_expire'),
      },
    );
    return { access_token };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.usersService.update(userId, {
      refresh_token: hashedRefreshToken,
    });
  }

  async getTokens(userId: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
        },
        {
          secret: this.configService.get('access_secret'),
          expiresIn: this.configService.get('access_expire'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
        },
        {
          secret: this.configService.get('refresh_secret'),
          expiresIn: this.configService.get('refresh_expire'),
        },
      ),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Generates a 5-digit OTP, stores it in Redis, and sends it via email.
   */
  async sendForgotPasswordOtp(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    // Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpHash = await this.hashData(otp);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
    const otpData = {
      user_id: user._id.toString(),
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
      attempts_left: 3,
    };
    await this.redisService.setJson(`otp:${user._id}`, otpData, 3 * 60); // 3 min TTL
    await this.mailService.sendOtpEmail(user.email, otp);
  }

  /**
   * Resets the user's password if OTP is valid (using Redis).
   */
  async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    const redisKey = `otp:${user._id}`;
    const otpData = await this.redisService.getJson<OtpData>(redisKey);
    if (!otpData) throw new BadRequestException(Messages.OTP_NOT_REQUESTED);
    if (new Date(otpData.expires_at) < new Date()) {
      await this.redisService.del(redisKey);
      throw new BadRequestException(Messages.OTP_EXPIRED);
    }
    if (otpData.attempts_left <= 0) {
      await this.redisService.del(redisKey);
      throw new BadRequestException('OTP attempts exceeded');
    }
    const isMatch = await bcrypt.compare(otp, otpData.otp_hash);
    if (!isMatch) {
      otpData.attempts_left -= 1;
      if (otpData.attempts_left <= 0) {
        await this.redisService.del(redisKey);
        throw new BadRequestException('OTP attempts exceeded');
      } else {
        await this.redisService.setJson(
          redisKey,
          otpData,
          Math.floor(
            (new Date(otpData.expires_at).getTime() - Date.now()) / 1000,
          ),
        );
        throw new BadRequestException(Messages.OTP_INVALID);
      }
    }
    // OTP is valid
    const hash = await this.hashData(newPassword);
    await this.usersService.update(user._id, {
      password: hash,
    });
    await this.redisService.del(redisKey);
  }
}

// OTP data interface for Redis
interface OtpData {
  user_id: string;
  otp_hash: string;
  expires_at: string;
  attempts_left: number;
}
