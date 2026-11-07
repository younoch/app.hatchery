import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'temp5678' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  temporaryPassword: string;
}
