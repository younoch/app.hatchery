import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_REGEX,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from '@/common/validation/limits';

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
