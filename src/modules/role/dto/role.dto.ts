import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ORG_PERMISSIONS,
  OrgPermission,
} from '@/common/permissions/permission.constants';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: ORG_PERMISSIONS.slice(0, 2) })
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions: OrgPermission[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'editor' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: ORG_PERMISSIONS.slice(0, 2) })
  @IsOptional()
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions?: OrgPermission[];
}
