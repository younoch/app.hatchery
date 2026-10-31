import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { UserPermissionResolver } from '@/common/permissions/user-permission.resolver';
import { ErrorCode } from '../errors/error-codes';
import { AppException } from '../errors/app.exception';

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
    if (!userId) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Unauthenticated',
      );
    }

    const allowed = await this.permissionResolver.hasPermission(
      userId,
      required,
    );
    if (!allowed) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'Missing permission',
      );
    }

    return true;
  }
}
