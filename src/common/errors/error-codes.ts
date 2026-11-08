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
