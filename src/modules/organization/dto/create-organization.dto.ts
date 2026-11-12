import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsCustomStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import {
  IsUsername,
  toLowerTrimmed,
} from '@/common/decorators/is-username.decorator';
import {
  EMAIL_SCHEMA,
  PASSWORD_SCHEMA,
  USERNAME_SCHEMA,
} from '@/common/swagger/constraints';
import {
  NAME_MAX,
  ORGANIZATION_NAME_MAX,
  PASSWORD_MIN,
} from '@/common/validation/limits';

export class OrganizationAdminDto {
  @ApiProperty({ example: 'cox-admin', ...USERNAME_SCHEMA })
  @IsUsername()
  username: string;

  @ApiProperty({ example: 'admin@hatchery.example', ...EMAIL_SCHEMA })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Rahim Uddin', maxLength: NAME_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX)
  name?: string;

  @ApiProperty({ example: 'temp1234', ...PASSWORD_SCHEMA })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @IsCustomStrongPassword()
  temporaryPassword: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Cox Hatchery', maxLength: ORGANIZATION_NAME_MAX })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(ORGANIZATION_NAME_MAX)
  name: string;

  @ApiProperty({ type: OrganizationAdminDto })
  @ValidateNested()
  @Type(() => OrganizationAdminDto)
  admin: OrganizationAdminDto;
}
