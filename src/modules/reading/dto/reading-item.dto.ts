import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';
import {
  READING_LIMITS,
  READING_NOTE_MAX,
  RECORDED_AT_FLOOR,
} from '../reading.constants';

const number = { allowNaN: false, allowInfinity: false };

export class ReadingItemDto {
  @ApiProperty({
    description: 'Client UUID v4; also the idempotency key',
    ...UUID_SCHEMA,
  })
  @IsUUID('4')
  id: string;

  @ApiProperty(UUID_SCHEMA)
  @IsUUID()
  tankId: string;

  @ApiProperty({
    example: '2026-11-08T04:30:00.000Z',
    format: 'date-time',
    description: `ISO 8601 with a time zone (Z or ±hh:mm); not before ${RECORDED_AT_FLOOR.toISOString()}`,
  })
  @IsString()
  recordedAt: string;

  @ApiProperty({
    example: 7.8,
    minimum: READING_LIMITS.ph.min,
    maximum: READING_LIMITS.ph.max,
  })
  @IsNumber(number)
  ph: number;

  @ApiProperty({
    example: 29.5,
    minimum: READING_LIMITS.temperatureC.min,
    maximum: READING_LIMITS.temperatureC.max,
  })
  @IsNumber(number)
  temperatureC: number;

  @ApiProperty({
    example: 30,
    minimum: READING_LIMITS.salinityPpt.min,
    maximum: READING_LIMITS.salinityPpt.max,
  })
  @IsNumber(number)
  salinityPpt: number;

  @ApiProperty({
    example: 5.2,
    minimum: READING_LIMITS.oxygenMgL.min,
    maximum: READING_LIMITS.oxygenMgL.max,
  })
  @IsNumber(number)
  oxygenMgL: number;

  @ApiPropertyOptional({ maxLength: READING_NOTE_MAX })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(READING_NOTE_MAX)
  note?: string;
}
