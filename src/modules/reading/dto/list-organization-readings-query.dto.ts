import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';
import {
  ORG_READINGS_PAGE_DEFAULT,
  ORG_READINGS_PAGE_MAX,
} from '../reading.constants';

export class ListOrganizationReadingsQueryDto {
  @ApiPropertyOptional({ description: 'Only this tank', ...UUID_SCHEMA })
  @IsOptional()
  @IsUUID()
  tankId?: string;

  @ApiPropertyOptional({
    description: 'Only readings recorded by this user',
    ...UUID_SCHEMA,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-11-01T00:00:00.000Z',
    description:
      'Inclusive lower bound of recordedAt; ISO 8601 with a time zone (Z or ±hh:mm)',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-11-08T00:00:00.000Z',
    description:
      'Exclusive upper bound of recordedAt; ISO 8601 with a time zone; must be after from',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'By recordedAt, ties by id; a chart wants asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    default: ORG_READINGS_PAGE_DEFAULT,
    minimum: 1,
    maximum: ORG_READINGS_PAGE_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORG_READINGS_PAGE_MAX)
  limit: number = ORG_READINGS_PAGE_DEFAULT;

  @ApiPropertyOptional({
    description:
      'The nextCursor of the previous page, unchanged; send the same filters and order again',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}