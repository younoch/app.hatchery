import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_REGEX,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from '@/common/validation/limits';

import { ORG_PERMISSIONS } from '@/common/permissions/permission.constants';

// Spread into `@ApiProperty({ ... })` so the schema carries the validator's numbers.
export const USERNAME_SCHEMA = {
  minLength: USERNAME_MIN,
  maxLength: USERNAME_MAX,
  pattern: USERNAME_REGEX.source,
} as const;

export const PASSWORD_SCHEMA = {
  minLength: PASSWORD_MIN,
  maxLength: PASSWORD_MAX,
  pattern: PASSWORD_REGEX.source,
  description: 'At least one letter and one number',
} as const;

export const EMAIL_SCHEMA = { format: 'email' } as const;
export const UUID_SCHEMA = { format: 'uuid' } as const;

export const ORG_PERMISSION_ENUM_NAME = 'OrgPermissionKey';

// Spread into `@ApiProperty({ ... })` of a list of organization-level keys: all
// of them point to one named schema, whose descriptions `buildOpenApiDocument` adds.
export const ORG_PERMISSION_ENUM = {
  enum: ORG_PERMISSIONS,
  enumName: ORG_PERMISSION_ENUM_NAME,
  isArray: true,
} as const;
