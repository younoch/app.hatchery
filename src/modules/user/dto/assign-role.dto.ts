import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 'role-id-here' })
  @IsString()
  @IsUUID()
  roleId: string;
}