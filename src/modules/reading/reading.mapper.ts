import type { ReadingWithAuthor } from '@/common/repositories/reading.repository';
import type { ReadingResponseDto } from './dto/reading-response.dto';

export function toReadingResponse(
  reading: ReadingWithAuthor,
): ReadingResponseDto {
  return {
    id: reading.id,
    tankId: reading.tankId,
    recordedAt: reading.recordedAt.toISOString(),
    ph: reading.ph,
    temperatureC: reading.temperatureC,
    salinityPpt: reading.salinityPpt,
    oxygenMgL: reading.oxygenMgL,
    note: reading.note,
    syncedAt: reading.syncedAt.toISOString(),
    createdBy: {
      id: reading.createdBy.id,
      username: reading.createdBy.username,
      name: reading.createdBy.name,
    },
  };
}