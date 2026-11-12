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
import { ROLE_NAME_MIN } from '@/common/validation/limits';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor', minLength: ROLE_NAME_MIN })
  @IsString()
  @MinLength(ROLE_NAME_MIN)
  name: string;

  @ApiProperty({
    example: ORG_PERMISSIONS.slice(0, 2),
    enum: ORG_PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions: OrgPermission[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'editor', minLength: ROLE_NAME_MIN })
  @IsOptional()
  @IsString()
  @MinLength(ROLE_NAME_MIN)
  name?: string;

  @ApiPropertyOptional({
    example: ORG_PERMISSIONS.slice(0, 2),
    enum: ORG_PERMISSIONS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions?: OrgPermission[];
}
