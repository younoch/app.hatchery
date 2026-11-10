import { ApiProperty } from '@nestjs/swagger';

export class OrganizationListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class OrganizationAdminDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;
}

export class OrganizationCreatedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: () => OrganizationAdminDto })
  admin: OrganizationAdminDto;
}
