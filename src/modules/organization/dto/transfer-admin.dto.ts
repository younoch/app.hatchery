import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';

export class TransferAdminDto {
  @ApiProperty(UUID_SCHEMA)
  @IsUUID()
  newAdminUserId: string;

  @ApiProperty({
    description: 'The role the previous admin gets (not admin)',
    ...UUID_SCHEMA,
  })
  @IsUUID()
  previousAdminRoleId: string;
}
