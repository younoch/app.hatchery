import type { ReadingWithAuthor } from '@/common/repositories/reading.repository';
import type { ReadingResponseDto } from './dto/reading-response.dto';

// Who is looking: decides `editableUntil`.
export interface ReadingViewer {
  userId: string;
  canCorrect: boolean;
  editWindowMs: number;
}

export function toReadingResponse(
  reading: ReadingWithAuthor,
  viewer: ReadingViewer,
): ReadingResponseDto {
  const mine = viewer.canCorrect && reading.createdBy.id === viewer.userId;
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
    updatedAt: reading.updatedAt.toISOString(),
    editableUntil: mine
      ? new Date(reading.syncedAt.getTime() + viewer.editWindowMs).toISOString()
      : null,
    createdBy: {
      id: reading.createdBy.id,
      username: reading.createdBy.username,
      name: reading.createdBy.name,
    },
  };
}