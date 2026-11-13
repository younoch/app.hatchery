import { ApiProperty } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';

export class ReadingResponseDto {
  @ApiProperty(UUID_SCHEMA)
  id: string;

  @ApiProperty(UUID_SCHEMA)
  tankId: string;

  @ApiProperty({ format: 'date-time', description: 'UTC' })
  recordedAt: string;

  @ApiProperty()
  ph: number;

  @ApiProperty()
  temperatureC: number;

  @ApiProperty()
  salinityPpt: number;

  @ApiProperty()
  oxygenMgL: number;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty({ format: 'date-time', description: 'UTC' })
  syncedAt: string;
}

export class ReadingListResponseDto {
  @ApiProperty({ type: () => ReadingResponseDto, isArray: true })
  items: ReadingResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null on the last page',
  })
  nextCursor: string | null;
}