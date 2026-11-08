import { Injectable, Logger } from '@nestjs/common';

export type AdminAction =
  | 'organization.create'
  | 'organization.transfer_admin'
  | 'user.create'
  | 'user.role_change'
  | 'user.deactivate'
  | 'user.activate'
  | 'user.reset_password'
  | 'user.delete'
  | 'user.password_change'
  | 'organization_role.update'
  | 'tank.create'
  | 'tank.update';

export interface AdminActionEntry {
  action: AdminAction;
  actorId: string;
  organizationId: string | null;
  targetId: string;
  // What changed. Never a password, a hash or a token.
  details?: Record<string, unknown>;
}

@Injectable()
export class AdminActionLogger {
  private readonly logger = new Logger('AdminAction');

  log(entry: AdminActionEntry) {
    this.logger.log({
      msg: 'admin_action',
      ...entry,
      details: entry.details ?? {},
    });
  }
}