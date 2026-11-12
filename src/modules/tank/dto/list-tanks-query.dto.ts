import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';

export class ListTanksQueryDto {
  @ApiPropertyOptional({
    description: 'Required for the super admin; others may only name their own',
    ...UUID_SCHEMA,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
