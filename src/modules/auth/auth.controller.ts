import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { RefreshTokenGuard } from '../../guards/jwt-refresh-guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('login')
  signin(@Body() data: LoginUserDto) {
    return this.authService.signIn(data);
  }

  @UseGuards(AccessTokenGuard)
  @Get('logout')
  logout(@Req() req: Request) {
    this.authService.logout(req.user['sub']);
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  refreshTokens(@Req() req: Request) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refresh_token'];
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
