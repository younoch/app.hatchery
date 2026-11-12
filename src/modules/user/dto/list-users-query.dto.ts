import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { UUID_SCHEMA } from '@/common/swagger/constraints';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Required for the super admin; others may only name their own',
    ...UUID_SCHEMA,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
