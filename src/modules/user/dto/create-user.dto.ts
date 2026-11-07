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
  IsUsername,
  toLowerTrimmed,
} from '@/common/decorators/is-username.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'rahim' })
  @IsUsername()
  username: string;

  @ApiProperty({ example: 'rahim@hatchery.example' })
  @Transform(toLowerTrimmed)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Rahim Uddin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty()
  @IsUUID()
  roleId: string;

  @ApiProperty({ example: 'temp1234' })
  @IsString()
  @MinLength(6)
  @IsCustomStrongPassword()
  temporaryPassword: string;

  @ApiPropertyOptional({ description: 'Super admin only' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
