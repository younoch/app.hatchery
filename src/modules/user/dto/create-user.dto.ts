import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import {
  EMAIL_SCHEMA,
  PASSWORD_SCHEMA,
  USERNAME_SCHEMA,
  UUID_SCHEMA,
} from '@/common/swagger/constraints';
import { NAME_MAX, PASSWORD_MIN } from '@/common/validation/limits';
import {
  IsUsername,
  toLowerTrimmed,
} from '@/common/decorators/is-username.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'rahim', ...USERNAME_SCHEMA })
  @IsUsername()
  username: string;

  @ApiProperty({ example: 'rahim@hatchery.example', ...EMAIL_SCHEMA })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Rahim Uddin', maxLength: NAME_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX)
  name?: string;

  @ApiProperty(UUID_SCHEMA)
  @IsUUID()
  roleId: string;

  @ApiProperty({ example: 'temp1234', ...PASSWORD_SCHEMA })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @IsCustomStrongPassword()
  temporaryPassword: string;

  @ApiPropertyOptional({ description: 'Super admin only', ...UUID_SCHEMA })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
