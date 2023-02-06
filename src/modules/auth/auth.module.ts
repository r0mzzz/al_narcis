import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AccessTokenStrategy } from '../../strategy/access-token';
import { RefreshTokenStrategy } from '../../strategy/refresh-token';
import { JwtModule } from '@nestjs/jwt';
import { MailService } from '../../services/mail.service';

@Module({
  imports: [UserModule, JwtModule.register({})],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    MailService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
