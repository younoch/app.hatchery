import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferAdminDto {
  @ApiProperty()
  @IsUUID()
  newAdminUserId: string;

  @ApiProperty({ description: 'The role the previous admin gets (not admin)' })
  @IsUUID()
  previousAdminRoleId: string;
}
