import { IsString, MinLength } from 'class-validator';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  newPassword: string;
}