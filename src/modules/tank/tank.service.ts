import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { TankRepository } from '@/common/repositories/tank.repository';
import { AdminActionLogger } from '@/common/audit/admin-action-logger';
import { resolveOrganizationId } from '@/common/tenant/resolve-organization-id';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { toTankResponse } from './tank.mapper';

@Injectable()
export class TankService {
  constructor(
    private readonly tankRepository: TankRepository,
    private readonly adminActionLogger: AdminActionLogger,
  ) {}

  async list(caller: JwtUser, requestedOrganizationId?: string) {
    const organizationId = resolveOrganizationId(
      caller,
      requestedOrganizationId,
    );
    const tanks =
      await this.tankRepository.findManyByOrganization(organizationId);
    return tanks.map(toTankResponse);
  }

  async create(dto: CreateTankDto, caller: JwtUser) {
    const organizationId = resolveOrganizationId(caller, dto.organizationId);
    await this.assertNameFree(organizationId, dto.name);
    const tank = await this.tankRepository.create(organizationId, dto.name);
    this.adminActionLogger.log({
      action: 'tank.create',
      actorId: caller.userId,
      organizationId,
      targetId: tank.id,
      details: { name: tank.name },
    });
    return toTankResponse(tank);
  }

  async update(id: string, dto: UpdateTankDto, caller: JwtUser) {
    if (dto.name === undefined && dto.isActive === undefined) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'Provide at least one of name, isActive',
      );
    }

    // A tank of another organization is 404, so existence is not revealed.
    const tank = await this.tankRepository.findById(id);
    if (
      !tank ||
      (!caller.isSuperAdmin && tank.organizationId !== caller.organizationId)
    ) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.TANK_NOT_FOUND,
        'Tank not found',
      );
    }

    if (dto.name !== undefined) {
      await this.assertNameFree(tank.organizationId, dto.name, tank.id);
    }

    const updated = await this.tankRepository.update(tank.id, {
      name: dto.name,
      isActive: dto.isActive,
    });
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (dto.name !== undefined && dto.name !== tank.name) {
      changes.name = { from: tank.name, to: updated.name };
    }
    if (dto.isActive !== undefined && dto.isActive !== tank.isActive) {
      changes.isActive = { from: tank.isActive, to: updated.isActive };
    }
    if (Object.keys(changes).length > 0) {
      this.adminActionLogger.log({
        action: 'tank.update',
        actorId: caller.userId,
        organizationId: tank.organizationId,
        targetId: tank.id,
        details: changes,
      });
    }
    return toTankResponse(updated);
  }

  private async assertNameFree(
    organizationId: string,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.tankRepository.findByNameIgnoringCase(
      organizationId,
      name,
      excludeId,
    );
    if (existing) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.TANK_NAME_TAKEN,
        'A tank with this name already exists in the organization',
      );
    }
  }
}
