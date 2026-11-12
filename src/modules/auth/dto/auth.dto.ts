import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LOGIN_PASSWORD_MIN } from '@/common/validation/limits';

const toLowerTrimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @Transform(toLowerTrimmed)
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'test1234', minLength: LOGIN_PASSWORD_MIN })
  @IsString()
  @MinLength(LOGIN_PASSWORD_MIN)
  password: string;
}
