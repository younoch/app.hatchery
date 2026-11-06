import { AppException } from '@/common/errors/app.exception';
import { resolveOrganizationId } from './resolve-organization-id';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as AppException).code;
  }
  return null;
};

describe('resolveOrganizationId', () => {
  const user = { isSuperAdmin: false, organizationId: 'org-1' };
  const superAdmin = { isSuperAdmin: true, organizationId: null };
  const orphan = { isSuperAdmin: false, organizationId: null };

  it('returns the caller organization for a normal user', () => {
    expect(resolveOrganizationId(user)).toBe('org-1');
    expect(resolveOrganizationId(user, 'org-1')).toBe('org-1');
  });

  it('rejects another organization for a normal user', () => {
    expect(codeOf(() => resolveOrganizationId(user, 'org-2'))).toBe(
      'organization_mismatch',
    );
  });

  it('rejects a user without an organization', () => {
    expect(codeOf(() => resolveOrganizationId(orphan))).toBe('no_organization');
  });

  it('requires an organization from the super admin', () => {
    expect(codeOf(() => resolveOrganizationId(superAdmin))).toBe(
      'organization_required',
    );
    expect(resolveOrganizationId(superAdmin, 'org-9')).toBe('org-9');
  });
});
