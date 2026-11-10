import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
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
    description: 'refresh_token cookie (httpOnly, Path /auth/refresh, 14 days)',
    schema: { type: 'string' },
  },
};

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Validation failed or bad request (validation_failed, bad_request, organization_required)',
  401: 'Missing or invalid token, wrong credentials or ended session (unauthorized, invalid_credentials, user_inactive, session_revoked)',
  403: 'Permission or tenant rule (permission_denied, no_organization, organization_mismatch, must_change_password)',
  404: 'Not found, or outside your organization (not_found, tank_not_found)',
  409: 'Conflict (username_taken, email_taken, tank_name_taken, org_admin_protected, cannot_target_self, conflict)',
  429: 'Rate limited; see the Retry-After header (rate_limited)',
  503: 'Email features are switched off (email_disabled)',
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

export const ApiErrors = (...statuses: number[]) =>
  applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: ERROR_DESCRIPTIONS[status] ?? 'Error',
        type: ErrorResponseDto,
      }),
    ),
  );
