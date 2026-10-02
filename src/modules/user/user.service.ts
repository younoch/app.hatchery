import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../common/repositories/user.repository';
import { EmailVerificationRepository } from './repository/email-verification.repository';
import { PrismaService } from '@/common/prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';
import { RoleRepository } from '../role/repository/role.repository';
import { paginate } from '@/common/helpers/paginate.helper';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly roleRepository: RoleRepository,
    private readonly prisma: PrismaService,
  ) {}

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findByEmailForAuth(email: string) {
    return this.userRepository.findByEmailForAuth(email);
  }

  createUser(email: string, hashedPassword: string) {
    return this.userRepository.create(email, hashedPassword);
  }
  async createUserWithVerification(
    email: string,
    hashedPassword: string,
    token: string,
    expiresAt: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.userRepository.create(email, hashedPassword, tx);
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

    return {
      id: user.id,
      email: user.email,
      role: user.role
        ? { name: user.role.name, permissions: user.role.permissions }
        : null,
    };
  }

  async deleteUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    return this.userRepository.deleteUser(userId);
  }
  async assignRole(
    targetUserId: string,
    roleId: string,
    currentUserId: string,
  ) {
    const targetRole = await this.roleRepository.findById(roleId);
    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }

    if (targetRole.name === 'admin') {
      const currentUser =
        await this.userRepository.findByIdWithRole(currentUserId);
      if (!currentUser?.isSuperAdmin) {
        throw new ForbiddenException(
          'Only a super admin can assign the admin role',
        );
      }
    }

    return this.userRepository.updateRole(targetUserId, roleId);
  }
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
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
    return this.userRepository.updatePassword(userId, hashedPassword);
  }
  async setPassword(userId: string, hashedPassword: string) {
    return this.userRepository.updatePassword(userId, hashedPassword);
  }
  async listUsers(query: PaginationQueryDto) {
    return paginate(
      () => this.userRepository.findAll(query.skip, query.pageSize),
      () => this.userRepository.count(),
      query.page,
      query.pageSize,
    );
  }
}
