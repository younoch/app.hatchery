type Scope = 'org' | 'platform';

// Single source of truth: resource -> action -> scope.
// Platform keys work only through the super-admin bypass and are never
// stored in an OrganizationRole or in a Role template.
export const PERMISSION_MAP = {
  user: {
    create: 'org',
    read: 'org',
    write: 'org',
    'reset-password': 'org',
    delete: 'platform',
  },
  organization: {
    create: 'platform',
    read: 'platform',
    'transfer-admin': 'platform',
  },
  role: {
    create: 'platform',
    read: 'platform',
    write: 'platform',
    delete: 'platform',
  },
  'organization-role': { read: 'org', write: 'org' },
  tank: { create: 'org', write: 'org' },
  reading: { create: 'org', 'read-all': 'org' },
} as const satisfies Record<string, Record<string, Scope>>;

type PermissionMap = typeof PERMISSION_MAP;

type KeysOfScope<S extends Scope> = {
  [R in keyof PermissionMap]: {
    [A in keyof PermissionMap[R]]: PermissionMap[R][A] extends S
      ? `${R & string}:${A & string}`
      : never;
  }[keyof PermissionMap[R]];
}[keyof PermissionMap];

export type Permission = KeysOfScope<Scope>;
export type OrgPermission = KeysOfScope<'org'>;
export type PlatformPermission = KeysOfScope<'platform'>;

const ENTRIES = Object.entries(PERMISSION_MAP).flatMap(([resource, actions]) =>
  Object.entries(actions as Record<string, Scope>).map(([action, scope]) => ({
    key: `${resource}:${action}` as Permission,
    scope,
  })),
);

export const PERMISSIONS: Permission[] = ENTRIES.map((e) => e.key);

export const ORG_PERMISSIONS = ENTRIES.filter((e) => e.scope === 'org').map(
  (e) => e.key as OrgPermission,
);

export const PLATFORM_PERMISSIONS = ENTRIES.filter(
  (e) => e.scope === 'platform',
).map((e) => e.key as PlatformPermission);
