import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import { PASSWORD_SCHEMA } from '@/common/swagger/constraints';
import { PASSWORD_MIN } from '@/common/validation/limits';

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'temp5678', ...PASSWORD_SCHEMA })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @IsCustomStrongPassword()
  temporaryPassword: string;
}
