import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { UserPermissionResolver } from '@/common/permissions/user-permission.resolver';
import { OrganizationRoleRepository } from '@/common/repositories/organization-role.repository';
import { AdminActionLogger } from '@/common/audit/admin-action-logger';
import { resolveOrganizationId } from '@/common/tenant/resolve-organization-id';
import { toOrganizationRoleResponse } from './organization-role.mapper';

@Injectable()
export class OrganizationRoleService {
  constructor(
    private readonly organizationRoleRepository: OrganizationRoleRepository,
    private readonly permissionResolver: UserPermissionResolver,
    private readonly adminActionLogger: AdminActionLogger,
  ) {}

  async list(caller: JwtUser, requestedOrganizationId?: string) {
    const organizationId = resolveOrganizationId(
      caller,
      requestedOrganizationId,
    );
    const rows =
      await this.organizationRoleRepository.findManyByOrganization(
        organizationId,
      );
    return rows.map(toOrganizationRoleResponse);
  }

  async updatePermissions(id: string, permissions: string[], caller: JwtUser) {
    // 1. Another organization's row is 404, so existence is not revealed.
    const row = await this.organizationRoleRepository.findByIdWithRole(id);
    if (
      !row ||
      (!caller.isSuperAdmin && row.organizationId !== caller.organizationId)
    ) {
      throw new NotFoundException('Organization role not found');
    }

    // 2. The admin row is not editable.
    if (row.role.name === 'admin') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'The admin role cannot be edited',
      );
    }

    // 3. Nobody can grant a key they do not hold (removing is always allowed).
    const requested = [...new Set(permissions)];
    const added = requested.filter((key) => !row.permissions.includes(key));
    if (added.length > 0) {
      const held = await this.permissionResolver.getPermissions(caller.userId);
      const notHeld = added.filter((key) => !held.includes(key));
      if (notHeld.length > 0) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          ErrorCode.PERMISSION_DENIED,
          `You cannot grant permissions you do not hold: ${notHeld.join(', ')}`,
        );
      }
    }

    const updated = await this.organizationRoleRepository.updatePermissions(
      row.id,
      requested,
    );
    const removed = row.permissions.filter((key) => !requested.includes(key));
    if (added.length > 0 || removed.length > 0) {
      this.adminActionLogger.log({
        action: 'organization_role.update',
        actorId: caller.userId,
        organizationId: row.organizationId,
        targetId: row.id,
        details: { role: row.role.name, added, removed },
      });
    }
    return toOrganizationRoleResponse(updated);
  }
}
