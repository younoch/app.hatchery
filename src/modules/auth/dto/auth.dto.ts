import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import { ApiProperty } from '@nestjs/swagger';

const toLowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @Transform(toLowerTrimmed)
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'test1234' })
  @IsString()
  @MinLength(6)
  password: string;
}
export class RegisterDto {
  @ApiProperty({ example: 'test@gmail.com' })
  @IsEmail()
  email: string;

  // Temporary: public signup is removed in T13.
  @ApiProperty({ example: 'admin' })
  @Transform(toLowerTrimmed)
  @Matches(/^[a-z0-9._-]{3,30}$/, { message: 'Invalid username' })
  username: string;

  @ApiProperty({ example: 'test1234' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  password: string;
}
