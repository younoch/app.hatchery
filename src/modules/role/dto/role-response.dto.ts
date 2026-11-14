import { ApiProperty } from '@nestjs/swagger';
import { ORG_PERMISSION_ENUM } from '@/common/swagger/constraints';
export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'manager' })
  name: string;

  @ApiProperty({
    description: 'Template; the real permissions are per organization',
    ...ORG_PERMISSION_ENUM,
  })
  permissions: string[];
}
