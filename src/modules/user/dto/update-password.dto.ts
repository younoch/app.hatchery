import { IsString, MinLength } from 'class-validator';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_SCHEMA } from '@/common/swagger/constraints';
import { PASSWORD_MIN } from '@/common/validation/limits';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456', ...PASSWORD_SCHEMA })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @IsCustomStrongPassword()
  newPassword: string;
}
