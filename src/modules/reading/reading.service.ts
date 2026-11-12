import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Reading } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppException, FieldError } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import { toFieldErrors } from '@/common/errors/validation-exception.factory';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { ReadingRepository } from '@/common/repositories/reading.repository';
import { TankRepository } from '@/common/repositories/tank.repository';
import { ReadingItemDto } from './dto/reading-item.dto';
import { SyncReadingsDto } from './dto/sync-readings.dto';
import type { SyncReadingsResponseDto } from './dto/sync-readings-response.dto';
import { READING_LIMITS, RECORDED_AT_FLOOR } from './reading.constants';

const RECORDED_AT_FORMAT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

interface ValidItem {
  index: number;
  dto: ReadingItemDto;
  recordedAt: Date;
  note: string | null;
}

export interface SyncResult {
  index: number;
  id?: string;
  status: 'created' | 'duplicate' | 'rejected';
  identical?: boolean;
  errors?: FieldError[];
}

function echoId(raw: unknown): { id?: string } {
  const id = (raw as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? { id } : {};
}

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);
  private readonly futureToleranceMs: number;

  constructor(
    private readonly readingRepository: ReadingRepository,
    private readonly tankRepository: TankRepository,
    configService: ConfigService,
  ) {
    this.futureToleranceMs = configService.getOrThrow<number>(
      'READING_FUTURE_TOLERANCE_MS',
    );
  }

  async sync(
    dto: SyncReadingsDto,
    caller: JwtUser,
  ): Promise<SyncReadingsResponseDto> {
    if (!caller.isSuperAdmin && !caller.organizationId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.NO_ORGANIZATION,
        'User has no organization',
      );
    }

    const results: SyncResult[] = [];
    const valid: ValidItem[] = [];
    for (const [index, raw] of dto.items.entries()) {
      const { errors, item } = await this.validateItem(raw, index);
      if (item) {
        valid.push(item);
      } else {
        results[index] = { index, ...echoId(raw), status: 'rejected', errors };
      }
    }

    const known = new Map<string, Reading>();
    const tankOrganizations = new Map<string, string>();
    if (valid.length > 0) {
      const ids = [...new Set(valid.map((item) => item.dto.id))];
      const tankIds = [...new Set(valid.map((item) => item.dto.tankId))];
      for (const reading of await this.readingRepository.findManyByIds(ids)) {
        known.set(reading.id, reading);
      }
      for (const tank of await this.tankRepository.findManyByIds(tankIds)) {
        tankOrganizations.set(tank.id, tank.organizationId);
      }
    }

    for (const item of valid) {
      results[item.index] = await this.store(
        item,
        caller,
        known,
        tankOrganizations,
      );
    }

    const totals = { created: 0, duplicate: 0, rejected: 0 };
    for (const result of results) totals[result.status] += 1;
    if (totals.rejected === results.length) {
      this.logger.warn({
        action: 'sync_all_rejected',
        userId: caller.userId,
        items: results.length,
      });
    }
    return { results, totals };
  }

  private async validateItem(
    raw: unknown,
    index: number,
  ): Promise<{ errors: FieldError[]; item?: ValidItem }> {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { errors: [{ field: 'item', code: ErrorCode.INVALID_TYPE }] };
    }

    const dto = plainToInstance(ReadingItemDto, raw);
    const errors = toFieldErrors(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    );
    const failed = new Set(errors.map((error) => error.field));

    for (const [field, { min, max }] of Object.entries(READING_LIMITS)) {
      const value = dto[field as keyof typeof READING_LIMITS];
      if (!failed.has(field) && (value < min || value > max)) {
        errors.push({
          field,
          code: ErrorCode.OUT_OF_RANGE,
          params: { min, max },
        });
      }
    }

    let recordedAt = new Date(NaN);
    if (!failed.has('recordedAt')) {
      recordedAt = new Date(dto.recordedAt);
      if (
        !RECORDED_AT_FORMAT.test(dto.recordedAt) ||
        Number.isNaN(recordedAt.getTime())
      ) {
        errors.push({ field: 'recordedAt', code: ErrorCode.INVALID_DATETIME });
      } else if (recordedAt < RECORDED_AT_FLOOR) {
        errors.push({
          field: 'recordedAt',
          code: ErrorCode.OUT_OF_RANGE,
          params: { min: RECORDED_AT_FLOOR.toISOString() },
        });
      } else if (recordedAt.getTime() > Date.now() + this.futureToleranceMs) {
        errors.push({
          field: 'recordedAt',
          code: ErrorCode.RECORDED_AT_IN_FUTURE,
        });
      }
    }

    if (errors.length > 0) return { errors };
    return { errors, item: { index, dto, recordedAt, note: dto.note || null } };
  }

  private async store(
    item: ValidItem,
    caller: JwtUser,
    known: Map<string, Reading>,
    tankOrganizations: Map<string, string>,
  ): Promise<SyncResult> {
    const { dto, index } = item;

    const existing = known.get(dto.id);
    if (existing) return this.existingResult(item, existing, caller);

    const tankOrganization = tankOrganizations.get(dto.tankId);
    if (
      !tankOrganization ||
      (!caller.isSuperAdmin && tankOrganization !== caller.organizationId)
    ) {
      return this.rejected(item, 'tankId', ErrorCode.TANK_NOT_FOUND);
    }

    try {
      const created = await this.readingRepository.create({
        id: dto.id,
        tankId: dto.tankId,
        createdById: caller.userId,
        ph: dto.ph,
        temperatureC: dto.temperatureC,
        salinityPpt: dto.salinityPpt,
        oxygenMgL: dto.oxygenMgL,
        note: item.note,
        recordedAt: item.recordedAt,
      });
      known.set(created.id, created);
      return { index, id: dto.id, status: 'created' };
    } catch (error) {
      // Two requests with the same id at once: the primary key lets one win.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.readingRepository.findById(dto.id);
        if (raced) {
          known.set(raced.id, raced);
          return this.existingResult(item, raced, caller);
        }
      }
      throw error;
    }
  }

  private existingResult(
    item: ValidItem,
    existing: Reading,
    caller: JwtUser,
  ): SyncResult {
    const { dto, index } = item;
    if (existing.createdById !== caller.userId) {
      return this.rejected(item, 'id', ErrorCode.ID_CONFLICT);
    }
    const identical =
      existing.tankId === dto.tankId &&
      existing.recordedAt.getTime() === item.recordedAt.getTime() &&
      existing.ph === dto.ph &&
      existing.temperatureC === dto.temperatureC &&
      existing.salinityPpt === dto.salinityPpt &&
      existing.oxygenMgL === dto.oxygenMgL &&
      existing.note === item.note;
    return { index, id: dto.id, status: 'duplicate', identical };
  }

  private rejected(
    item: ValidItem,
    field: string,
    code: FieldError['code'],
  ): SyncResult {
    return {
      index: item.index,
      id: item.dto.id,
      status: 'rejected',
      errors: [{ field, code }],
    };
  }
}
