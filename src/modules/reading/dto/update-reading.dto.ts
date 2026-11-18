import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';
import {
  READING_LIMITS,
  READING_NOTE_MAX,
  RECORDED_AT_FLOOR,
} from '../reading.constants';

const number = { allowNaN: false, allowInfinity: false };
const sent = (_: unknown, value: unknown) => value !== undefined;

export class UpdateReadingDto {
  @ApiProperty({
    format: 'date-time',
    example: '2026-11-18T04:30:00.000Z',
    description:
      'The updatedAt the client holds; ISO 8601 with a time zone. A different value than the stored one: 409 stale_reading',
  })
  @IsString()
  expectedUpdatedAt: string;

  @ApiPropertyOptional(UUID_SCHEMA)
  @ValidateIf(sent)
  @IsUUID()
  tankId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: `ISO 8601 with a time zone; not before ${RECORDED_AT_FLOOR.toISOString()}`,
  })
  @ValidateIf(sent)
  @IsString()
  recordedAt?: string;

  @ApiPropertyOptional({
    minimum: READING_LIMITS.ph.min,
    maximum: READING_LIMITS.ph.max,
  })
  @ValidateIf(sent)
  @IsNumber(number)
  ph?: number;

  @ApiPropertyOptional({
    minimum: READING_LIMITS.temperatureC.min,
    maximum: READING_LIMITS.temperatureC.max,
  })
  @ValidateIf(sent)
  @IsNumber(number)
  temperatureC?: number;

  @ApiPropertyOptional({
    minimum: READING_LIMITS.salinityPpt.min,
    maximum: READING_LIMITS.salinityPpt.max,
  })
  @ValidateIf(sent)
  @IsNumber(number)
  salinityPpt?: number;

  @ApiPropertyOptional({
    minimum: READING_LIMITS.oxygenMgL.min,
    maximum: READING_LIMITS.oxygenMgL.max,
  })
  @ValidateIf(sent)
  @IsNumber(number)
  oxygenMgL?: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: READING_NOTE_MAX,
    description: 'null (or an empty text) clears the note',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(READING_NOTE_MAX)
  note?: string | null;
}