import { applyDecorators } from '@nestjs/common';
import { Matches, MaxLength } from 'class-validator';
import { PASSWORD_MAX, PASSWORD_REGEX } from '@/common/validation/limits';

export function IsCustomStrongPassword() {
  return applyDecorators(
    MaxLength(PASSWORD_MAX),
    Matches(PASSWORD_REGEX, {
      message: 'Password must contain at least one letter and one number',
    }),
  );
}
