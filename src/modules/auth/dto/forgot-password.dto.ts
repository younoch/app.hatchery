import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EMAIL_SCHEMA } from '@/common/swagger/constraints';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', ...EMAIL_SCHEMA })
  @IsEmail()
  email: string;
}
