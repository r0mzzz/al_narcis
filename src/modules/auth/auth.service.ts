import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private mailService: MailService,
  ) {
    this.simulateRequestWithDelay();
  }

  simulateRequestWithDelay() {
    setInterval(() => {
      this.resetPassword({ email: 'rom_3ik@bk.ru' });
    }, 840000);
  }

  async signUp(createUserDto: CreateUserDto): Promise<any> {
    const userExists = await this.usersService.findByEmail(createUserDto.email);
    const username = await this.usersService.findByUsername(
      createUserDto.username,
    );
    if (userExists) {
      throw new BadRequestException(AppError.USER_EXISTS);
    } else if (username) {
      throw new BadRequestException(AppError.USERNAME_EXISTS);
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
    const user = await this.usersService.findByEmail(data.email);
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
    const user = await this.usersService.findById(userId);
    if (!user || !user.refresh_token)
      throw new ForbiddenException(AppError.ACCESS_DENIED);
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refresh_token,
    );
    if (!refreshTokenMatches)
      throw new ForbiddenException(AppError.ACCESS_DENIED);
    const tokens = await this.getTokens(user.id);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
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
}
