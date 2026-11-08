import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const number = { allowNaN: false, allowInfinity: false };

export class ReadingItemDto {
  @ApiProperty({ description: 'Client UUID v4; also the idempotency key' })
  @IsUUID('4')
  id: string;

  @ApiProperty()
  @IsUUID()
  tankId: string;

  @ApiProperty({
    example: '2026-11-08T04:30:00.000Z',
    description: 'ISO 8601 with a time zone (Z or ±hh:mm)',
  })
  @IsString()
  recordedAt: string;

  @ApiProperty({ example: 7.8 })
  @IsNumber(number)
  ph: number;

  @ApiProperty({ example: 29.5 })
  @IsNumber(number)
  temperatureC: number;

  @ApiProperty({ example: 30 })
  @IsNumber(number)
  salinityPpt: number;

  @ApiProperty({ example: 5.2 })
  @IsNumber(number)
  oxygenMgL: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  note?: string;
}