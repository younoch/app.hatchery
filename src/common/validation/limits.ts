export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = new RegExp(
  `^[a-z0-9._-]{${USERNAME_MIN},${USERNAME_MAX}}$`,
);

// New passwords (temporary and changed). Login has its own, lower minimum so
// older accounts can still sign in if PASSWORD_MIN is raised.
export const PASSWORD_MIN = 6;
// bcrypt ignores everything past 72 bytes, so a longer limit would be a lie.
export const PASSWORD_MAX = 72;
export const LOGIN_PASSWORD_MIN = 6;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const NAME_MAX = 100;
export const ORGANIZATION_NAME_MAX = 100;
export const TANK_NAME_MAX = 50;
export const ROLE_NAME_MIN = 2;
export const PAGE_SIZE_MAX = 100;
