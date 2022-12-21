import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // async generateJwtToken(user) {
  //   const payload = { user };
  //   return this.jwtService.sign(payload, {
  //     secret: this.configService.get('access_secret'),
  //     expiresIn: this.configService.get('expire_jwt'),
  //   });
  // }
  //
  // async generateJwtRefreshToken(user) {
  //   const payload = { user };
  //   return this.jwtService.signAsync(payload, {
  //     secret: this.configService.get('refresh_Secret'),
  //     expiresIn: this.configService.get('expire_refresh_jwt'),
  //   });
  // }
}
