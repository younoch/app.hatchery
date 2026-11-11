import type { ResponseErrorCode } from '@/common/errors/error-codes';

// No token needed.
export const ERRORS_PUBLIC = [
  'rate_limited',
] as const satisfies readonly ResponseErrorCode[];

// A token is needed and the password may still be the temporary one
// (`@AllowMustChangePassword()` endpoints).
export const ERRORS_SESSION_TEMP_PASSWORD_OK = [
  'unauthorized',
  'user_inactive',
  'rate_limited',
] as const satisfies readonly ResponseErrorCode[];

// A token is needed and the password must already be changed.
export const ERRORS_SESSION = [
  ...ERRORS_SESSION_TEMP_PASSWORD_OK,
  'must_change_password',
] as const satisfies readonly ResponseErrorCode[];

// A token and a permission key are needed.
export const ERRORS_PERMISSION = [
  ...ERRORS_SESSION,
  'permission_denied',
] as const satisfies readonly ResponseErrorCode[];

// The endpoint resolves the organization (`resolveOrganizationId`).
export const ERRORS_TENANT = [
  'organization_required',
  'no_organization',
  'organization_mismatch',
] as const satisfies readonly ResponseErrorCode[];
