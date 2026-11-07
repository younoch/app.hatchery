import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListOrganizationRolesQueryDto {
  @ApiPropertyOptional({
    description: 'Required for the super admin; others may only name their own',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}