import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppException, FieldError } from '../errors/app.exception';
import { ErrorCode, codeFromStatus } from '../errors/error-codes';

import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino/Logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let errors: FieldError[] | undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = ErrorCode.NOT_FOUND;
        message = 'Record not found';
      } else if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = ErrorCode.CONFLICT;
        message = 'A record with this value already exists';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        code = ErrorCode.CONFLICT;
        message = 'This record is referenced by other records';
      } else {
        this.logger.error(
          {
            action: 'unhandled_prisma_error',
            code: exception.code,
          },
          exception.message,
        );
      }
    } else if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      errors = exception.errors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = codeFromStatus(status);
      message = this.messageOf(exception);
    } else if (this.isPayloadTooLarge(exception)) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      code = ErrorCode.PAYLOAD_TOO_LARGE;
      message = 'Request body is too large';
    } else {
      this.logger.error(
        { action: 'unhandled_error' },
        exception instanceof Error ? exception.message : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      path: request.url,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  // message is always a string: never an array or a nested object
  private messageOf(exception: HttpException): string {
    const res = exception.getResponse();
    if (typeof res === 'string') return res;
    const message = (res as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
    return exception.message;
  }

  // body-parser errors are not HttpExceptions
  private isPayloadTooLarge(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { type?: unknown }).type === 'entity.too.large'
    );
  }
}
