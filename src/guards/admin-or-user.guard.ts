import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminAuthGuard } from './admin-auth.guard';
import { AccessTokenGuard } from './jwt-guard';

@Injectable()
export class AdminOrUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => AdminAuthGuard))
    private readonly adminGuard: AdminAuthGuard,
    @Inject(forwardRef(() => AccessTokenGuard))
    private readonly userGuard: AccessTokenGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      if (await this.adminGuard.canActivate(context)) return true;
    } catch {}
    try {
      if (await this.userGuard.canActivate(context)) return true;
    } catch {}
    throw new UnauthorizedException('Unauthorized');
  }
}
