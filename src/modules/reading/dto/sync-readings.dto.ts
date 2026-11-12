import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReadingItemDto } from './reading-item.dto';
import { SYNC_MAX_ITEMS } from '../reading.constants';

export class SyncReadingsDto {
  @ApiProperty({
    type: () => ReadingItemDto,
    isArray: true,
    minItems: 1,
    maxItems: SYNC_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SYNC_MAX_ITEMS)
  items: unknown[];
}
