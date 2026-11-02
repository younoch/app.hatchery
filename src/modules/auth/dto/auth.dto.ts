import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
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
