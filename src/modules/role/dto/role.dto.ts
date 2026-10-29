import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PERMISSIONS,
  Permission,
} from '@/common/permissions/permission.constants';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: PERMISSIONS.slice(0, 2) })
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions: Permission[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'editor' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: PERMISSIONS.slice(0, 2) })
  @IsOptional()
  @IsArray()
  @IsIn(PERMISSIONS, { each: true })
  permissions?: Permission[];
}
