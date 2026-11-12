import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { USERNAME_REGEX } from '@/common/validation/limits';

export const toLowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export function IsUsername() {
  return applyDecorators(
    Transform(toLowerTrimmed),
    Matches(USERNAME_REGEX, { message: 'Invalid username' }),
  );
}
