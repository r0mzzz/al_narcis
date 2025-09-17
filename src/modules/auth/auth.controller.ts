import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { RefreshTokenGuard } from '../../guards/jwt-refresh-guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('login')
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

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.sendForgotPasswordOtp(dto.email);
    return { status: 'ok', message: 'OTP sent to email' };
  }

  @Post('reset-password')
  async resetPasswordWithOtp(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPasswordWithOtp(dto.email, dto.otp, dto.newPassword);
    return { status: 'ok', message: 'Password updated successfully' };
  }
}
