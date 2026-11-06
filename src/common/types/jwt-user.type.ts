export interface JwtUser {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  organizationId: string | null;
}
