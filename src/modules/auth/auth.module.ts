import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AccessTokenStrategy } from '../../strategy/access-token';
import { RefreshTokenStrategy } from '../../strategy/refresh-token';
import { MailService } from '../../services/mail.service';
import { RedisModule } from '../../services/redis.module';
import { JwtSharedModule } from '../../services/jwt-shared.module';

@Module({
  imports: [UserModule, JwtSharedModule, RedisModule],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    MailService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
