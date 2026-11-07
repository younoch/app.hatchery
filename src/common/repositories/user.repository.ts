import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Safe default: password কখনো রিটার্ন করবে না
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      omit: { password: true },
    });
  }

  // শুধু AuthService.validateUser() ব্যবহার করবে (bcrypt compare করতে)
  findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByUsernameForAuth(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { id },
      omit: { password: true },
    });
  }

  findByUsername(username: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { username },
      omit: { password: true },
    });
  }

  findAdminOfOrganization(
    organizationId: string,
    adminRoleId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.findFirst({
      where: { organizationId, roleId: adminRoleId },
      omit: { password: true },
    });
  }

  createInOrganization(
    data: {
      email: string;
      username: string;
      name?: string;
      hashedPassword: string;
      organizationId: string;
      roleId: string;
      mustChangePassword: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        password: data.hashedPassword,
        organizationId: data.organizationId,
        roleId: data.roleId,
        mustChangePassword: data.mustChangePassword,
      },
      omit: { password: true },
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findAll(organizationId: string, skip: number, take: number) {
    return this.prisma.user.findMany({
      where: { organizationId },
      skip,
      take,
      omit: { password: true },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  count(organizationId: string) {
    return this.prisma.user.count({ where: { organizationId } });
  }

  create(
    email: string,
    username: string,
    hashedPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.create({
      data: { email, username, password: hashedPassword },
      omit: { password: true },
    });
  }
  markEmailVerified(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  updatePassword(
    userId: string,
    hashedPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
      omit: { password: true },
    });
  }
  updateRole(userId: string, roleId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { roleId },
      omit: { password: true },
    });
  }

  updateProfile(
    userId: string,
    data: { roleId?: string; isActive?: boolean; name?: string },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data,
      omit: { password: true },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  setTemporaryPassword(
    userId: string,
    hashedPassword: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: true },
      omit: { password: true },
    });
  }

  async findByIdWithRole(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { userId: id } });

      return tx.user.delete({
        where: { id },
        omit: { password: true },
      });
    });
  }
}
