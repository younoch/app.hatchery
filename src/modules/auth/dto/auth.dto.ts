import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'test@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'test@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'test1234' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  password: string;
}
