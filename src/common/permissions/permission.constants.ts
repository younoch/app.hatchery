const RESOURCES = ['user', 'role'] as const;
const ACTIONS = ['create', 'read', 'write', 'delete'] as const;

export const PERMISSIONS = RESOURCES.flatMap((resource) =>
  ACTIONS.map((action) => `${resource}:${action}` as const),
);

export type Permission = (typeof PERMISSIONS)[number];
