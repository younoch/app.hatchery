import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export const toLowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export function IsUsername() {
  return applyDecorators(
    Transform(toLowerTrimmed),
    Matches(/^[a-z0-9._-]{3,30}$/, { message: 'Invalid username' }),
  );
}
