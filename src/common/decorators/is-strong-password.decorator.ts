import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';
import { PASSWORD_REGEX } from '@/common/validation/limits';

export function IsCustomStrongPassword() {
  return applyDecorators(
    Matches(PASSWORD_REGEX, {
      message: 'Password must contain at least one letter and one number',
    }),
  );
}
