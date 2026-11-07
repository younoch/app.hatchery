import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import { paginate } from '@/common/helpers/paginate.helper';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserRepository } from '@/common/repositories/user.repository';
import { OrganizationRoleRepository } from '@/common/repositories/organization-role.repository';
import { RoleRepository } from '../role/repository/role.repository';
import { OrganizationRepository } from './repository/organization.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { TransferAdminDto } from './dto/transfer-admin.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationRoleRepository: OrganizationRoleRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateOrganizationDto) {
    const roles = await this.roleRepository.findAll();
    const adminRole = roles.find((role) => role.name === 'admin');
    if (!adminRole) {
      throw new InternalServerErrorException('Global roles are not seeded');
    }

    const { username, email, name, temporaryPassword } = dto.admin;
    await this.userService.assertUsernameAndEmailFree(username, email);

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const organization = await this.organizationRepository.create(
        dto.name,
        tx,
      );
      // Copy-on-create: the organization gets its own copy of every template.
      await this.organizationRoleRepository.createMany(
        organization.id,
        roles.map((role) => ({
          roleId: role.id,
          permissions: role.permissions,
        })),
        tx,
      );
      const admin = await this.userRepository.createInOrganization(
        {
          email,
          username,
          name,
          hashedPassword,
          organizationId: organization.id,
          roleId: adminRole.id,
          mustChangePassword: true,
        },
        tx,
      );
      return {
        id: organization.id,
        name: organization.name,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
        },
      };
    });
  }

  list(query: PaginationQueryDto) {
    return paginate(
      () => this.organizationRepository.findAll(query.skip, query.pageSize),
      () => this.organizationRepository.count(),
      query.page,
      query.pageSize,
    );
  }

  async transferAdmin(organizationId: string, dto: TransferAdminDto) {
    const adminRole = await this.roleRepository.findByName('admin');
    if (!adminRole) {
      throw new InternalServerErrorException('Global roles are not seeded');
    }
    if (dto.previousAdminRoleId === adminRole.id) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
        'previousAdminRoleId cannot be the admin role',
      );
    }
    const previousRole = await this.roleRepository.findById(
      dto.previousAdminRoleId,
    );
    if (!previousRole) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.NOT_FOUND,
        'Role not found',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const exists = await this.organizationRepository.lockById(
        organizationId,
        tx,
      );
      if (!exists) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.NOT_FOUND,
          'Organization not found',
        );
      }

      const newAdmin = await this.userRepository.findById(
        dto.newAdminUserId,
        tx,
      );
      if (!newAdmin || newAdmin.organizationId !== organizationId) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.NOT_FOUND,
          'User not found',
        );
      }
      if (!newAdmin.isActive) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.CONFLICT,
          'The new admin must be an active user',
        );
      }

      const currentAdmin = await this.userRepository.findAdminOfOrganization(
        organizationId,
        adminRole.id,
        tx,
      );
      if (currentAdmin?.id === newAdmin.id) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.BAD_REQUEST,
          'This user is already the admin',
        );
      }

      if (currentAdmin) {
        await this.userRepository.updateRole(
          currentAdmin.id,
          previousRole.id,
          tx,
        );
      }
      await this.userRepository.updateRole(newAdmin.id, adminRole.id, tx);
    });

    return { message: 'Admin transferred' };
  }
}
