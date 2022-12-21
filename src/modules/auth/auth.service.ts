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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
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
    const tokens = await this.getTokens(newUser._id, newUser.email);
    await this.updateRefreshToken(newUser._id, tokens.refresh_token);
    return tokens;
  }

  async signIn(data: LoginUserDto) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) throw new BadRequestException(AppError.WRONG_DATA);
    const tokens = await this.getTokens(user._id, user.email);
    await this.updateRefreshToken(user._id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: string) {
    return this.usersService.update(userId, { refreshToken: null });
  }

  hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken)
      throw new ForbiddenException(AppError.ACCESS_DENIED);
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches)
      throw new ForbiddenException(AppError.ACCESS_DENIED);
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await this.hashData(refreshToken);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async getTokens(userId: string, email: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('access_secret'),
          expiresIn: this.configService.get('access_expire'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('refresh_secret'),
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
