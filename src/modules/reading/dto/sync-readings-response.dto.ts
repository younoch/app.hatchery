import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldErrorDto } from '@/common/swagger/error-response.dto';

export class SyncResultDto {
  @ApiProperty({ description: "The item's position in the request" })
  index: number;

  @ApiPropertyOptional({
    description: 'Echoed only when the item had a string id',
  })
  id?: string;

  @ApiProperty({ enum: ['created', 'duplicate', 'rejected'] })
  status: 'created' | 'duplicate' | 'rejected';

  @ApiPropertyOptional({
    description: 'Only on duplicate: the stored values equal the sent ones',
  })
  identical?: boolean;

  @ApiPropertyOptional({ type: () => FieldErrorDto, isArray: true })
  errors?: FieldErrorDto[];
}

export class SyncTotalsDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  duplicate: number;

  @ApiProperty()
  rejected: number;
}

export class SyncReadingsResponseDto {
  @ApiProperty({ type: () => SyncResultDto, isArray: true })
  results: SyncResultDto[];

  @ApiProperty({ type: () => SyncTotalsDto })
  totals: SyncTotalsDto;
}
