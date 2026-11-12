import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';
import { NAME_MAX } from '@/common/validation/limits';

export class UpdateUserDto {
  @ApiPropertyOptional(UUID_SCHEMA)
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Rahim Uddin', maxLength: NAME_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX)
  name?: string;
}
