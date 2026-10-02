import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtUser } from '../types/jwt-user.type';
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const user = request.user as JwtUser;
    if (!user) throw new UnauthorizedException('User not found in request');

    return user;
  },
);