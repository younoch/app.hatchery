import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';

export interface TenantCaller {
  isSuperAdmin: boolean;
  organizationId: string | null;
}

// The single door to organization-scoped data (AGENTS.md → Tenant isolation).
export function resolveOrganizationId(
  caller: TenantCaller,
  requested?: string | null,
): string {
  if (caller.isSuperAdmin) {
    if (!requested) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ORGANIZATION_REQUIRED,
        'organizationId is required',
      );
    }
    return requested;
  }

  if (!caller.organizationId) {
    throw new AppException(
      HttpStatus.FORBIDDEN,
      ErrorCode.NO_ORGANIZATION,
      'User has no organization',
    );
  }
  if (requested && requested !== caller.organizationId) {
    throw new AppException(
      HttpStatus.FORBIDDEN,
      ErrorCode.ORGANIZATION_MISMATCH,
      'Another organization was requested',
    );
  }
  return caller.organizationId;
}
