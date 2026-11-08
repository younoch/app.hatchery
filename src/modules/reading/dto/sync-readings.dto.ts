import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReadingItemDto } from './reading-item.dto';

export class SyncReadingsDto {
  @ApiProperty({ type: () => ReadingItemDto, isArray: true, minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  items: unknown[];
}