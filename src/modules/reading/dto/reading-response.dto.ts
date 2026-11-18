import { ApiProperty } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';

export class ReadingAuthorDto {
  @ApiProperty(UUID_SCHEMA)
  id: string;

  @ApiProperty({ example: 'rahim' })
  username: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;
}
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

  @ApiProperty({
    format: 'date-time',
    description:
      'UTC. When the reading was stored, and again on every correction; send it back as expectedUpdatedAt',
  })
  updatedAt: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'UTC. Until when the author may correct or delete it; null for everybody else. May lie in the past (window closed)',
  })
  editableUntil: string | null;

  @ApiProperty({ type: () => ReadingAuthorDto })
  createdBy: ReadingAuthorDto;
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


export class ReadingLatestResponseDto {
  @ApiProperty({
    type: () => ReadingResponseDto,
    isArray: true,
    description:
      'The newest reading of each tank that has one; no order is promised',
  })
  items: ReadingResponseDto[];
}