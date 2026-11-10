import { ApiProperty } from '@nestjs/swagger';

export class OrganizationRoleResponseDto {
  @ApiProperty({ description: 'The OrganizationRole row id (use it in PATCH)' })
  id: string;

  @ApiProperty({ description: 'The global role id (use it for users)' })
  roleId: string;

  @ApiProperty({ example: 'staff' })
  name: string;

  @ApiProperty({ type: [String] })
  permissions: string[];

  @ApiProperty({ description: 'false for the admin role' })
  editable: boolean;
}
