import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { ORG_PERMISSIONS } from '@/common/permissions/permission.constants';

export class UpdateOrganizationRoleDto {
  @ApiProperty({
    description: 'The full new permission list (org-level keys only)',
    enum: ORG_PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions!: string[];
}
