import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_MUST_CHANGE_PASSWORD } from '@/common/decorators/allow-must-change-password.decorator';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import type { JwtUser } from '@/common/types/jwt-user.type';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = JwtUser>(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const authenticated = super.handleRequest(err, user, info, context);

    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_MUST_CHANGE_PASSWORD,
      [context.getHandler(), context.getClass()],
    );
    if (authenticated.mustChangePassword && !allowed) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.MUST_CHANGE_PASSWORD,
        'Change your temporary password first',
      );
    }
    return authenticated as TUser;
  }
}
