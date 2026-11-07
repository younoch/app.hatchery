import { ORG_PERMISSIONS } from '@/common/permissions/permission.constants';

interface OrganizationRoleSource {
  id: string;
  permissions: string[];
  role: { id: string; name: string };
}

// The admin row is never used for permissions (the resolver gives the admin
// every org key), so the response shows that and marks it read-only.
export function toOrganizationRoleResponse(row: OrganizationRoleSource) {
  const isAdmin = row.role.name === 'admin';
  return {
    id: row.id,
    roleId: row.role.id,
    name: row.role.name,
    permissions: isAdmin ? [...ORG_PERMISSIONS] : row.permissions,
    editable: !isAdmin,
  };
}