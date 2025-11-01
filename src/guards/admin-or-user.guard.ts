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
    const req = context.switchToHttp().getRequest();
    try {
      if (await this.adminGuard.canActivate(context)) {
        // If adminGuard succeeded, propagate admin as user for downstream use
        req.user = req.admin;
        return true;
      }
    } catch {}
    try {
      if (await this.userGuard.canActivate(context)) {
        // If userGuard succeeded, req.user is already set
        return true;
      }
    } catch {}
    throw new UnauthorizedException('Unauthorized');
  }
}
