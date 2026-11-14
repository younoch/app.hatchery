import { ApiProperty } from '@nestjs/swagger';
import { ORG_PERMISSION_ENUM } from '@/common/swagger/constraints';

export class OrganizationRoleResponseDto {
  @ApiProperty({ description: 'The OrganizationRole row id (use it in PATCH)' })
  id: string;

  @ApiProperty({ description: 'The global role id (use it for users)' })
  roleId: string;

  @ApiProperty({ example: 'staff' })
  name: string;

  @ApiProperty(ORG_PERMISSION_ENUM)
  permissions: string[];

  @ApiProperty({ description: 'false for the admin role' })
  editable: boolean;
}
