import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'manager' })
  name: string;

  @ApiProperty({
    type: [String],
    description: 'Template; the real permissions are per organization',
  })
  permissions: string[];
}
