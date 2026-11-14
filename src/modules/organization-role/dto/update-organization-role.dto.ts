import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn } from 'class-validator';
import { ORG_PERMISSIONS } from '@/common/permissions/permission.constants';
import { ORG_PERMISSION_ENUM } from '@/common/swagger/constraints';

export class UpdateOrganizationRoleDto {
  @ApiProperty({
    description: 'The full new permission list (org-level keys only)',
    ...ORG_PERMISSION_ENUM,
  })
  @IsArray()
  @IsIn(ORG_PERMISSIONS, { each: true })
  permissions!: string[];
}
