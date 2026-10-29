import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

export function IsCustomStrongPassword() {
  return applyDecorators(
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: 'Password must contain at least one letter and one number',
    }),
  );
}
