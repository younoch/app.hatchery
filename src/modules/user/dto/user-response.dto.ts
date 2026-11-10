import { ApiProperty } from '@nestjs/swagger';

export class RoleRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'staff' })
  name: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  mustChangePassword: boolean;

  @ApiProperty({ type: String, nullable: true })
  organizationId: string | null;

  @ApiProperty({ type: () => RoleRefDto, nullable: true })
  role: RoleRefDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class MeRoleDto {
  @ApiProperty({ example: 'admin' })
  name: string;
}

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty({ type: String, nullable: true })
  organizationId: string | null;

  @ApiProperty({ type: [String], example: ['reading:create'] })
  permissions: string[];

  @ApiProperty()
  mustChangePassword: boolean;

  @ApiProperty({ type: () => MeRoleDto, nullable: true })
  role: MeRoleDto | null;
}
