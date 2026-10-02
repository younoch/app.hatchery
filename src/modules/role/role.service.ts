import { Injectable } from '@nestjs/common';
import { RoleRepository } from './repository/role.repository';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findAll() {
    return this.roleRepository.findAll();
  }

  async create(dto: CreateRoleDto) {
    return this.roleRepository.create({
      name: dto.name,
      permissions: dto.permissions,
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    return this.roleRepository.update(id, dto);
  }
}