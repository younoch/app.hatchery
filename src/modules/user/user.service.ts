import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, VerificationStatus } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { paginate } from '@/common/helpers/paginate.helper';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { UserPermissionResolver } from '@/common/permissions/user-permission.resolver';
import { OrganizationRoleRepository } from '@/common/repositories/organization-role.repository';
import { resolveOrganizationId } from '@/common/tenant/resolve-organization-id';

import { UserRepository } from '../../common/repositories/user.repository';
import { EmailVerificationRepository } from './repository/email-verification.repository';
import { RoleRepository } from '../role/repository/role.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { toUserResponse } from './user.mapper';
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionResolver: UserPermissionResolver,
    private readonly organizationRoleRepository: OrganizationRoleRepository,
  ) {}

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findByEmailForAuth(email: string) {
    return this.userRepository.findByEmailForAuth(email);
  }

  findByUsernameForAuth(username: string) {
    return this.userRepository.findByUsernameForAuth(username);
  }

  createUser(email: string, username: string, hashedPassword: string) {
    return this.userRepository.create(email, username, hashedPassword);
  }
  findById(id: string) {
    return this.userRepository.findById(id);
  }
  async assertUsernameAndEmailFree(username: string, email: string) {
    if (await this.userRepository.findByUsername(username)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.USERNAME_TAKEN,
        'Username is already taken',
      );
    }
    if (await this.userRepository.findByEmail(email)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.EMAIL_TAKEN,
        'Email is already taken',
      );
    }
  }

  async createInOrganization(dto: CreateUserDto, caller: JwtUser) {
    const organizationId = resolveOrganizationId(caller, dto.organizationId);

    const role = await this.roleRepository.findById(dto.roleId);
    if (role?.name === 'admin') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'The admin role is assigned only when an organization is created or by admin transfer',
      );
    }
    const organizationRole =
      role &&
      (await this.organizationRoleRepository.findByOrganizationAndRole(
        organizationId,
        role.id,
      ));
    if (!role || !organizationRole) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'The role is not available in this organization',
      );
    }

    await this.assertUsernameAndEmailFree(dto.username, dto.email);
    const hashedPassword = await bcrypt.hash(dto.temporaryPassword, 10);

    const user = await this.userRepository.createInOrganization({
      email: dto.email,
      username: dto.username,
      name: dto.name,
      hashedPassword,
      organizationId,
      roleId: role.id,
      mustChangePassword: true,
    });
    return toUserResponse({
      ...user,
      role: { id: role.id, name: role.name },
    });
  }
  async createUserWithVerification(
    email: string,
    username: string,
    hashedPassword: string,
    token: string,
    expiresAt: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.userRepository.create(
        email,
        username,
        hashedPassword,
        tx,
      );
      await this.emailVerificationRepository.create(
        user.id,
        token,
        expiresAt,
        tx,
      );
      return user;
    });
  }

  async regenerateVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ) {
    return this.emailVerificationRepository.updateToken(
      userId,
      token,
      expiresAt,
    );
  }
  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification =
      await this.emailVerificationRepository.findByToken(token);

    if (!verification) {
      throw new BadRequestException('Invalid verification link');
    }

    if (verification.status === VerificationStatus.VERIFIED) {
      return { message: 'Email is already verified' };
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification link has expired');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.emailVerificationRepository.markVerified(
        verification.userId,
        tx,
      );
      await this.userRepository.markEmailVerified(verification.userId, tx);
    });

    return { message: 'Email verified successfully' };
  }

  async getVerificationByUserId(userId: string) {
    return this.emailVerificationRepository.findByUserId(userId);
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const permissions = await this.permissionResolver.getPermissions(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      organizationId: user.organizationId,
      permissions,
      mustChangePassword: user.mustChangePassword,
      role: user.role ? { name: user.role.name } : null,
    };
  }

  async deleteUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CANNOT_TARGET_SELF,
        'You cannot delete your own account',
      );
    }
    const target = await this.userRepository.findByIdWithRole(userId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.organizationId && target.role?.name === 'admin') {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ORG_ADMIN_PROTECTED,
        "The organization's admin cannot be deleted",
      );
    }
    return this.userRepository.deleteUser(userId);
  }
  async assignRole(targetUserId: string, roleId: string, caller: JwtUser) {
    const targetRole = await this.roleRepository.findById(roleId);
    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }
    if (targetRole.name === 'admin') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'The admin role is assigned only when an organization is created or by admin transfer',
      );
    }

    const target = await this.userRepository.findByIdWithRole(targetUserId);
    // Outside the caller's organization: 404, so existence is not revealed.
    if (
      !target ||
      (!caller.isSuperAdmin && target.organizationId !== caller.organizationId)
    ) {
      throw new NotFoundException('User not found');
    }
    if (target.role?.name === 'admin') {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ORG_ADMIN_PROTECTED,
        "The organization's admin changes only through admin transfer",
      );
    }

    return this.userRepository.updateRole(targetUserId, roleId);
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    const user = await this.userRepository.findByIdForAuth(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.userRepository.updatePassword(userId, hashedPassword, tx);
  }
  async setPassword(
    userId: string,
    hashedPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.userRepository.updatePassword(userId, hashedPassword, tx);
  }
  async listUsers(query: ListUsersQueryDto, caller: JwtUser) {
    const organizationId = resolveOrganizationId(caller, query.organizationId);
    const result = await paginate(
      () =>
        this.userRepository.findAll(organizationId, query.skip, query.pageSize),
      () => this.userRepository.count(organizationId),
      query.page,
      query.pageSize,
    );
    return { items: result.items.map(toUserResponse), meta: result.meta };
  }
}
