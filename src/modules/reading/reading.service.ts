import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Reading } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppException, FieldError } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import { toFieldErrors } from '@/common/errors/validation-exception.factory';
import type { JwtUser } from '@/common/types/jwt-user.type';
import {
  ReadingRepository,
  type ReadingChanges,
  type ReadingDetail,
} from '@/common/repositories/reading.repository';
import { UserPermissionResolver } from '@/common/permissions/user-permission.resolver';
import { TankRepository } from '@/common/repositories/tank.repository';
import { ReadingItemDto } from './dto/reading-item.dto';
import { SyncReadingsDto } from './dto/sync-readings.dto';
import type { SyncReadingsResponseDto } from './dto/sync-readings-response.dto';
import {
  READING_LIMITS,
  RECORDED_AT_FLOOR,
  RECORDED_AT_FORMAT,
} from './reading.constants';
import type { ListReadingsQueryDto } from './dto/list-readings-query.dto';
import type { ListOrganizationReadingsQueryDto } from './dto/list-organization-readings-query.dto';
import type {
  ReadingLatestResponseDto,
  ReadingListResponseDto,
} from './dto/reading-response.dto';
import type { ReadingWithAuthor } from '@/common/repositories/reading.repository';
import { toReadingResponse, type ReadingViewer } from './reading.mapper';
import type { UpdateReadingDto } from './dto/update-reading.dto';
import type { ReadingResponseDto } from './dto/reading-response.dto';

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
  private readonly editWindowMs: number;

  constructor(
    private readonly readingRepository: ReadingRepository,
    private readonly tankRepository: TankRepository,
    private readonly permissionResolver: UserPermissionResolver,
    configService: ConfigService,
  ) {
    this.futureToleranceMs = configService.getOrThrow<number>(
      'READING_FUTURE_TOLERANCE_MS',
    );
    this.editWindowMs =
      configService.getOrThrow<number>('READING_EDIT_WINDOW_HOURS') * 3_600_000;
  }

  async list(
    query: ListReadingsQueryDto,
    caller: JwtUser,
  ): Promise<ReadingListResponseDto> {
    if (!caller.organizationId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.NO_ORGANIZATION,
        'User has no organization',
      );
    }

    const { from, to, after } = this.parsePageQuery(query);
    const rows = await this.readingRepository.findPageForUser({
      userId: caller.userId,
      tankId: query.tankId,
      from,
      to,
      after,
      order: 'desc',
      take: query.limit + 1,
    });
    return this.toPage(rows, query.limit, await this.viewer(caller));
  }

  async listOrganization(
    query: ListOrganizationReadingsQueryDto,
    caller: JwtUser,
  ): Promise<ReadingListResponseDto> {
    const organizationId = this.requireOrganization(caller);
    const { from, to, after } = this.parsePageQuery(query);
    if (query.tankId) {
      const tank = await this.tankRepository.findById(query.tankId);
      if (!tank || tank.organizationId !== organizationId) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.TANK_NOT_FOUND,
          'Tank not found',
        );
      }
    }
    const rows = await this.readingRepository.findPageForOrganization({
      organizationId,
      tankId: query.tankId,
      userId: query.userId,
      from,
      to,
      after,
      order: query.order,
      take: query.limit + 1,
    });
    return this.toPage(rows, query.limit, await this.viewer(caller));
  }

  async listLatestPerTank(caller: JwtUser): Promise<ReadingLatestResponseDto> {
    const organizationId = this.requireOrganization(caller);
    const rows = await this.readingRepository.findLatestPerTank(organizationId);
    const viewer = await this.viewer(caller);
    return { items: rows.map((row) => toReadingResponse(row, viewer)) };
  }

  async getOne(id: string, caller: JwtUser): Promise<ReadingResponseDto> {
    const organizationId = this.requireOrganization(caller);
    const reading = await this.readingRepository.findDetail(id);
    if (
      !reading ||
      reading.deletedAt ||
      reading.tank.organizationId !== organizationId
    ) {
      throw this.notFound();
    }
    if (
      reading.createdById !== caller.userId &&
      !(await this.permissionResolver.hasPermission(
        caller.userId,
        'reading:read-all',
      ))
    ) {
      throw this.notFound();
    }
    return toReadingResponse(reading, await this.viewer(caller));
  }

  async correct(
    id: string,
    dto: UpdateReadingDto,
    caller: JwtUser,
  ): Promise<ReadingResponseDto> {
    const organizationId = this.requireOrganization(caller);
    const { changes, expectedUpdatedAt } = this.parseChanges(dto);

    const reading = await this.readingRepository.findDetail(id);
    if (
      !reading ||
      reading.deletedAt ||
      reading.tank.organizationId !== organizationId
    ) {
      throw this.notFound();
    }
    if (reading.createdById !== caller.userId) throw this.notAuthor();

    if (changes.tankId !== undefined && changes.tankId !== reading.tankId) {
      const tank = await this.tankRepository.findById(changes.tankId);
      if (!tank || tank.organizationId !== organizationId) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.TANK_NOT_FOUND,
          'Tank not found',
        );
      }
    }

    const viewer = await this.viewer(caller);
    if (this.isUnchanged(reading, changes)) {
      return toReadingResponse(reading, viewer);
    }
    if (this.windowClosed(reading)) throw this.windowClosedError();
    if (reading.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw this.stale();
    }

    const done = await this.readingRepository.correct({
      reading,
      expectedUpdatedAt,
      changedById: caller.userId,
      changes,
    });
    const fresh = await this.readingRepository.findDetail(id);
    if (!done || !fresh) throw this.stale();
    return toReadingResponse(fresh, viewer);
  }

  async remove(id: string, caller: JwtUser): Promise<{ message: string }> {
    const organizationId = this.requireOrganization(caller);
    const reading = await this.readingRepository.findDetail(id);
    if (!reading || reading.tank.organizationId !== organizationId) {
      throw this.notFound();
    }
    if (reading.createdById !== caller.userId) {
      throw reading.deletedAt ? this.notFound() : this.notAuthor();
    }
    if (reading.deletedAt) return { message: 'Reading deleted' };
    if (this.windowClosed(reading)) throw this.windowClosedError();
    await this.readingRepository.softDelete(reading, caller.userId);
    return { message: 'Reading deleted' };
  }

  private async viewer(caller: JwtUser): Promise<ReadingViewer> {
    return {
      userId: caller.userId,
      canCorrect: await this.permissionResolver.hasPermission(
        caller.userId,
        'reading:create',
      ),
      editWindowMs: this.editWindowMs,
    };
  }

  private windowClosed(reading: ReadingDetail): boolean {
    return Date.now() > reading.syncedAt.getTime() + this.editWindowMs;
  }

  private notFound() {
    return new AppException(
      HttpStatus.NOT_FOUND,
      ErrorCode.READING_NOT_FOUND,
      'Reading not found',
    );
  }

  private notAuthor() {
    return new AppException(
      HttpStatus.FORBIDDEN,
      ErrorCode.NOT_AUTHOR,
      'Only the author can change a reading',
    );
  }

  private windowClosedError() {
    return new AppException(
      HttpStatus.FORBIDDEN,
      ErrorCode.EDIT_WINDOW_CLOSED,
      'The correction window of this reading has closed',
    );
  }

  private stale() {
    return new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.STALE_READING,
      'The reading changed since it was read; fetch it again',
    );
  }

  private parseChanges(dto: UpdateReadingDto): {
    changes: ReadingChanges;
    expectedUpdatedAt: Date;
  } {
    const errors: FieldError[] = [];
    const expectedUpdatedAt = this.parseBound(
      'expectedUpdatedAt',
      dto.expectedUpdatedAt,
      errors,
    );
    const fields = [
      'tankId',
      'recordedAt',
      'ph',
      'temperatureC',
      'salinityPpt',
      'oxygenMgL',
      'note',
    ] as const;
    if (fields.every((field) => dto[field] === undefined)) {
      errors.push({ field: 'body', code: ErrorCode.REQUIRED });
    }
    this.checkLimits(dto, new Set(), errors);
    const recordedAt =
      dto.recordedAt === undefined
        ? undefined
        : this.checkRecordedAt(dto.recordedAt, errors);
    if (errors.length > 0 || !expectedUpdatedAt) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'Validation failed',
        errors,
      );
    }
    const changes: ReadingChanges = {
      tankId: dto.tankId,
      recordedAt,
      ph: dto.ph,
      temperatureC: dto.temperatureC,
      salinityPpt: dto.salinityPpt,
      oxygenMgL: dto.oxygenMgL,
      note: dto.note === undefined ? undefined : dto.note || null,
    };
    return { changes, expectedUpdatedAt };
  }

  // True when every field the client sent already holds that value.
  private isUnchanged(
    reading: ReadingDetail,
    changes: ReadingChanges,
  ): boolean {
    const recordedAt = changes.recordedAt as Date | undefined;
    return (
      (changes.tankId === undefined || changes.tankId === reading.tankId) &&
      (recordedAt === undefined ||
        recordedAt.getTime() === reading.recordedAt.getTime()) &&
      (changes.ph === undefined || changes.ph === reading.ph) &&
      (changes.temperatureC === undefined ||
        changes.temperatureC === reading.temperatureC) &&
      (changes.salinityPpt === undefined ||
        changes.salinityPpt === reading.salinityPpt) &&
      (changes.oxygenMgL === undefined ||
        changes.oxygenMgL === reading.oxygenMgL) &&
      (changes.note === undefined || changes.note === reading.note)
    );
  }

  private checkLimits(
    values: Partial<Record<keyof typeof READING_LIMITS, number>>,
    failed: Set<string>,
    errors: FieldError[],
  ): void {
    for (const [field, { min, max }] of Object.entries(READING_LIMITS)) {
      const value = values[field as keyof typeof READING_LIMITS];
      if (
        value !== undefined &&
        !failed.has(field) &&
        (value < min || value > max)
      ) {
        errors.push({
          field,
          code: ErrorCode.OUT_OF_RANGE,
          params: { min, max },
        });
      }
    }
  }

  private checkRecordedAt(raw: string, errors: FieldError[]): Date | undefined {
    const recordedAt = new Date(raw);
    if (!RECORDED_AT_FORMAT.test(raw) || Number.isNaN(recordedAt.getTime())) {
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
    } else {
      return recordedAt;
    }
    return undefined;
  }

  private requireOrganization(caller: JwtUser): string {
    if (!caller.organizationId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.NO_ORGANIZATION,
        'User has no organization',
      );
    }
    return caller.organizationId;
  }

  private parsePageQuery(query: {
    from?: string;
    to?: string;
    cursor?: string;
  }) {
    const errors: FieldError[] = [];
    const from = this.parseBound('from', query.from, errors);
    const to = this.parseBound('to', query.to, errors);
    const after = this.decodeCursor(query.cursor, errors);
    if (from && to && from >= to) {
      errors.push({ field: 'to', code: ErrorCode.OUT_OF_RANGE });
    }
    if (errors.length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'Validation failed',
        errors,
      );
    }
    return { from, to, after };
  }

  private toPage(
    rows: ReadingWithAuthor[],
    limit: number,
    viewer: ReadingViewer,
  ): ReadingListResponseDto {
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items: items.map((row) => toReadingResponse(row, viewer)),
      nextCursor: rows.length > limit && last ? this.encodeCursor(last) : null,
    };
  }

  private parseBound(
    field: string,
    value: string | undefined,
    errors: FieldError[],
  ): Date | undefined {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (!RECORDED_AT_FORMAT.test(value) || Number.isNaN(date.getTime())) {
      errors.push({ field, code: ErrorCode.INVALID_DATETIME });
      return undefined;
    }
    return date;
  }

  private encodeCursor(reading: Reading): string {
    return Buffer.from(
      JSON.stringify([reading.recordedAt.toISOString(), reading.id]),
    ).toString('base64url');
  }

  private decodeCursor(
    cursor: string | undefined,
    errors: FieldError[],
  ): { recordedAt: Date; id: string } | undefined {
    if (cursor === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        typeof parsed[0] === 'string' &&
        typeof parsed[1] === 'string'
      ) {
        const recordedAt = new Date(parsed[0]);
        if (!Number.isNaN(recordedAt.getTime())) {
          return { recordedAt, id: parsed[1] };
        }
      }
    } catch {
      // falls through to the error below
    }
    errors.push({ field: 'cursor', code: ErrorCode.INVALID_FORMAT });
    return undefined;
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

    this.checkLimits(dto, failed, errors);

    let recordedAt = new Date(NaN);
    if (!failed.has('recordedAt')) {
      recordedAt = this.checkRecordedAt(dto.recordedAt, errors) ?? recordedAt;
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
