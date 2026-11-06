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

export class OrganizationAdminDto {
  @ApiProperty({ example: 'cox-admin' })
  @IsUsername()
  username: string;

  @ApiProperty({ example: 'admin@hatchery.example' })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Rahim Uddin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'temp1234' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  temporaryPassword: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Cox Hatchery' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: OrganizationAdminDto })
  @ValidateNested()
  @Type(() => OrganizationAdminDto)
  admin: OrganizationAdminDto;
}
