import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/common/repositories/user.repository';
import { OrganizationRoleRepository } from '@/common/repositories/organization-role.repository';
import { PERMISSIONS, ORG_PERMISSIONS } from '@/common/permissions/permission.constants';

@Injectable()
export class UserPermissionResolver {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRoleRepository: OrganizationRoleRepository,
  ) {}

  async getPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findByIdWithRoleName(userId);
    if (!user) return [];
    if (user.isSuperAdmin) return [...PERMISSIONS];
    if (!user.organizationId || !user.roleId) return [];
    if (user.role?.name === 'admin') return [...ORG_PERMISSIONS];

    const row = await this.organizationRoleRepository.findByOrganizationAndRole(
      user.organizationId,
      user.roleId,
    );
    return row?.permissions ?? [];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (user.isSuperAdmin) return true; // superAdmin bypass — single source
    const permissions = await this.getPermissions(userId);
    return permissions.includes(permission);
  }
}
