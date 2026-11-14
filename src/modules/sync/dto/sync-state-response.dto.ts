import { ApiProperty } from '@nestjs/swagger';

const MARKER = {
  type: String,
  format: 'date-time',
  nullable: true,
  example: '2026-11-13T10:00:00.000Z',
} as const;

export class SyncStateResponseDto {
  @ApiProperty({
    ...MARKER,
    description:
      'Change marker of the organization itself; null when never written. Opaque: refetch when it differs from the stored one',
  })
  organization: string | null;

  @ApiProperty({
    ...MARKER,
    description:
      'Change marker of the tank list (create, rename, activate, deactivate); null when never written',
  })
  tanks: string | null;

  @ApiProperty({
    ...MARKER,
    description:
      'Change marker of the organization role list (permissions); null when never written',
  })
  organizationRoles: string | null;
}