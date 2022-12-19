import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AccessTokenStrategy } from '../../strategy/access-token';
import { TokenModule } from '../token/token.module';
import { RefreshTokenStrategy } from '../../strategy/refresh-token';

@Module({
  imports: [UserModule, TokenModule],
  providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
