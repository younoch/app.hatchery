import { SetMetadata } from '@nestjs/common';

export const ALLOW_MUST_CHANGE_PASSWORD = 'allowMustChangePassword';

// Marks the few routes a user may call before changing a temporary password.
export const AllowMustChangePassword = () =>
  SetMetadata(ALLOW_MUST_CHANGE_PASSWORD, true);
