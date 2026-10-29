import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { UserPermissionResolver } from '@/common/permissions/user-permission.resolver';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionResolver: UserPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true; // decorator না থাকলে open route

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId?: string } }>();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException('Unauthenticated');

    const allowed = await this.permissionResolver.hasPermission(
      userId,
      required,
    );
    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${required}`);
    }

    return true;
  }
}
