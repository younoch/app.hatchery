import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtension,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  RESPONSE_ERROR_STATUS,
  type ResponseErrorCode,
} from '@/common/errors/error-codes';
import { ErrorResponseDto } from './error-response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';

interface EnvelopeOptions {
  status?: number;
  isArray?: boolean;
  description?: string;
  headers?: ApiResponseOptions['headers'];
}

export const REFRESH_COOKIE_HEADER: ApiResponseOptions['headers'] = {
  'Set-Cookie': {
    description:
      'Sets the refresh_token cookie: httpOnly, 14 days, Path /auth/refresh (the REFRESH_COOKIE_PATH setting; /api/auth/refresh behind the Vercel rewrite)',
    schema: { type: 'string' },
  },
};

export const REFRESH_COOKIE_CLEARED_HEADER: ApiResponseOptions['headers'] = {
  'Set-Cookie': {
    description: 'Clears the refresh_token cookie (same Path)',
    schema: { type: 'string' },
  },
};

const RETRY_AFTER_HEADER: ApiResponseOptions['headers'] = {
  'Retry-After': {
    description: 'Seconds to wait before the next request',
    schema: { type: 'integer' },
  },
};

const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: 'Bad request',
  401: 'Not signed in',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  413: 'Request body too large',
  429: 'Rate limited',
  503: 'Email features are switched off',
};

function envelopeSchema(data: Record<string, unknown>, status: number) {
  return {
    type: 'object',
    required: ['success', 'statusCode', 'data', 'timestamp'],
    properties: {
      success: { type: 'boolean', example: true },
      statusCode: { type: 'integer', example: status },
      data,
      timestamp: { type: 'string', format: 'date-time' },
    },
  };
}

// The response is `{ success, statusCode, data, timestamp }`; this describes `data`.
export const ApiEnvelope = (
  model: Type<unknown>,
  options: EnvelopeOptions = {},
) => {
  const status = options.status ?? 200;
  const ref = { $ref: getSchemaPath(model) };
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description: options.description ?? 'Success',
      headers: options.headers,
      schema: envelopeSchema(
        options.isArray ? { type: 'array', items: ref } : ref,
        status,
      ),
    }),
  );
};

// `data` is `{ items, meta }`.
export const ApiPaginatedEnvelope = (
  model: Type<unknown>,
  options: { status?: number; description?: string } = {},
) => {
  const status = options.status ?? 200;
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status,
      description: options.description ?? 'Success',
      schema: envelopeSchema(
        {
          type: 'object',
          required: ['items', 'meta'],
          properties: {
            items: { type: 'array', items: { $ref: getSchemaPath(model) } },
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          },
        },
        status,
      ),
    }),
  );
};

// Lists only the codes the endpoint can really return, grouped by HTTP status.
export const ApiErrors = (...codes: ResponseErrorCode[]) => {
  const byStatus = new Map<number, ResponseErrorCode[]>();
  for (const code of new Set(codes)) {
    const status = RESPONSE_ERROR_STATUS[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ...[...byStatus]
      .sort(([a], [b]) => a - b)
      .map(([status, statusCodes]) =>
        ApiResponse({
          status,
          description: `${STATUS_DESCRIPTIONS[status]}: ${statusCodes.join(', ')}`,
          headers: status === 429 ? RETRY_AFTER_HEADER : undefined,
          schema: {
            allOf: [
              { $ref: getSchemaPath(ErrorResponseDto) },
              {
                type: 'object',
                properties: {
                  statusCode: { type: 'integer', enum: [status] },
                  code: { type: 'string', enum: statusCodes },
                },
              },
            ],
          },
        }),
      ),
  );
};

export const ApiAllowedWhileMustChangePassword = () =>
  applyDecorators(
    ApiOperation({
      description: 'Works while `mustChangePassword` is true.',
    }),
    ApiExtension('x-works-while-must-change-password', true),
  );
