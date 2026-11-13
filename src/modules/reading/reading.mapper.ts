import type { Reading } from '@prisma/client';
import type { ReadingResponseDto } from './dto/reading-response.dto';

export function toReadingResponse(reading: Reading): ReadingResponseDto {
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
  };
}