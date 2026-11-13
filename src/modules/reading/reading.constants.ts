export const SYNC_MAX_ITEMS = 100;
export const READING_NOTE_MAX = 200;
export const RECORDED_AT_FLOOR = new Date('2020-01-01T00:00:00.000Z');

// Impossible-value guards, not ideal ranges (progress.md → Readings sync).
export const READING_LIMITS = {
  ph: { min: 0, max: 14 },
  temperatureC: { min: 0, max: 60 },
  salinityPpt: { min: 0, max: 100 },
  oxygenMgL: { min: 0, max: 30 },
} as const;

export const READINGS_PAGE_DEFAULT = 50;
export const READINGS_PAGE_MAX = 100;

export const RECORDED_AT_FORMAT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
