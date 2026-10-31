import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface FieldError {
  field: string;
  code: ErrorCode;
  params?: Record<string, unknown>;
}

// Throw this from services when the frontend needs a specific code.
export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
    message: string,
    readonly errors?: FieldError[],
  ) {
    super({ code, message, errors }, status);
  }
}
