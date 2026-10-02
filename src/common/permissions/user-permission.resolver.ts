import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/common/repositories/user.repository';

@Injectable()
export class UserPermissionResolver {
  constructor(private readonly userRepository: UserRepository) {}

  private async getUserWithRole(userId: string) {
    return this.userRepository.findByIdWithRole(userId);
  }

  async getPermissions(userId: string): Promise<string[]> {
    const user = await this.getUserWithRole(userId);
    return user?.role?.permissions ?? [];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.getUserWithRole(userId);
    if (!user) return false;
    if (user.isSuperAdmin) return true; // superAdmin bypass — single source
    return user.role?.permissions.includes(permission) ?? false;
  }
}
