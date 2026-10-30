import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { Response } from 'express';

// With named throttlers the library would send `Retry-After-<name>`.
// The contract (B→F-19, F→B-17) says a plain `Retry-After`.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();
    const seconds = detail.isBlocked
      ? detail.timeToBlockExpire
      : detail.timeToExpire;
    response.header('Retry-After', String(Math.max(1, seconds)));
    throw new ThrottlerException();
  }
}
