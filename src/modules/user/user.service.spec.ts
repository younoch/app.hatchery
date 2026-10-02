import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UserRepository } from '../../common/repositories/user.repository';
import { EmailVerificationRepository } from './repository/email-verification.repository';
import { RoleRepository } from '../role/repository/role.repository';

describe('UserService', () => {
  let service: UserService;
  let deleteUser: jest.Mock;

  beforeEach(async () => {
    deleteUser = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: {} },
        { provide: UserRepository, useValue: { deleteUser } },
        { provide: EmailVerificationRepository, useValue: {} },
        { provide: RoleRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deletes a user through the repository', async () => {
    const deletedUser = { id: 'user-id', email: 'user@example.com' };
    deleteUser.mockResolvedValue(deletedUser);

    await expect(
      service.deleteUser('user-id', 'current-user-id'),
    ).resolves.toEqual(deletedUser);
    expect(deleteUser).toHaveBeenCalledWith('user-id');
  });

  it('throws when deleting your own account', async () => {
    await expect(
      service.deleteUser('current-user-id', 'current-user-id'),
    ).rejects.toThrow('You cannot delete your own account');
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
