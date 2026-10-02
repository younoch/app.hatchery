import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-from-email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  newPassword: string;
}