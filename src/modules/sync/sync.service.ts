import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import type { JwtUser } from '@/common/types/jwt-user.type';
import { SyncMarkerRepository } from '@/common/repositories/sync-marker.repository';
import type { SyncStateResponseDto } from './dto/sync-state-response.dto';

@Injectable()
export class SyncService {
  constructor(private readonly syncMarkerRepository: SyncMarkerRepository) {}

  async state(caller: JwtUser): Promise<SyncStateResponseDto> {
    if (!caller.organizationId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.NO_ORGANIZATION,
        'User has no organization',
      );
    }
    const rows = await this.syncMarkerRepository.findByOrganization(
      caller.organizationId,
    );
    const at = (resource: string) =>
      rows.find((row) => row.resource === resource)?.changedAt.toISOString() ??
      null;
    return {
      organization: at('organization'),
      tanks: at('tanks'),
      organizationRoles: at('organizationRoles'),
    };
  }
}