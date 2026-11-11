export const ErrorCode = {
  // field level
  REQUIRED: 'required',
  INVALID_TYPE: 'invalid_type',
  INVALID_FORMAT: 'invalid_format',
  TOO_SHORT: 'too_short',
  TOO_LONG: 'too_long',
  OUT_OF_RANGE: 'out_of_range',
  INVALID_UUID: 'invalid_uuid',
  INVALID_DATETIME: 'invalid_datetime',
  NOT_ALLOWED: 'not_allowed',
  WEAK_PASSWORD: 'weak_password',
  INVALID_USERNAME: 'invalid_username',
  // request level
  VALIDATION_FAILED: 'validation_failed',
  BAD_REQUEST: 'bad_request',
  ORGANIZATION_REQUIRED: 'organization_required',
  INVALID_CREDENTIALS: 'invalid_credentials',
  USER_INACTIVE: 'user_inactive',
  SESSION_REVOKED: 'session_revoked',
  UNAUTHORIZED: 'unauthorized',
  MUST_CHANGE_PASSWORD: 'must_change_password',
  PERMISSION_DENIED: 'permission_denied',
  NO_ORGANIZATION: 'no_organization',
  ORGANIZATION_MISMATCH: 'organization_mismatch',
  ORG_ADMIN_PROTECTED: 'org_admin_protected',
  CANNOT_TARGET_SELF: 'cannot_target_self',
  USERNAME_TAKEN: 'username_taken',
  EMAIL_TAKEN: 'email_taken',
  TANK_NAME_TAKEN: 'tank_name_taken',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  TANK_NOT_FOUND: 'tank_not_found',
  ID_CONFLICT: 'id_conflict',
  RECORDED_AT_IN_FUTURE: 'recorded_at_in_future',
  EMAIL_DISABLED: 'email_disabled',
  RATE_LIMITED: 'rate_limited',
  PAYLOAD_TOO_LARGE: 'payload_too_large',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Default code when a plain Nest exception carries no specific code.
export function codeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.PERMISSION_DENIED;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 413:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

// The `code` of an entry in `errors[]`; the readings sync also uses the last three per item.
export const FIELD_ERROR_CODES = [
  ErrorCode.REQUIRED,
  ErrorCode.INVALID_TYPE,
  ErrorCode.INVALID_FORMAT,
  ErrorCode.TOO_SHORT,
  ErrorCode.TOO_LONG,
  ErrorCode.OUT_OF_RANGE,
  ErrorCode.INVALID_UUID,
  ErrorCode.INVALID_DATETIME,
  ErrorCode.NOT_ALLOWED,
  ErrorCode.WEAK_PASSWORD,
  ErrorCode.INVALID_USERNAME,
  ErrorCode.TANK_NOT_FOUND,
  ErrorCode.ID_CONFLICT,
  ErrorCode.RECORDED_AT_IN_FUTURE,
] as const;

// Response-level codes and the HTTP status each one comes with (used by Swagger).
export const RESPONSE_ERROR_STATUS = {
  validation_failed: 400,
  bad_request: 400,
  organization_required: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  user_inactive: 401,
  session_revoked: 401,
  must_change_password: 403,
  permission_denied: 403,
  no_organization: 403,
  organization_mismatch: 403,
  not_found: 404,
  tank_not_found: 404,
  org_admin_protected: 409,
  cannot_target_self: 409,
  username_taken: 409,
  email_taken: 409,
  tank_name_taken: 409,
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  email_disabled: 503,
} as const satisfies Partial<Record<ErrorCode, number>>;

export type ResponseErrorCode = keyof typeof RESPONSE_ERROR_STATUS;
