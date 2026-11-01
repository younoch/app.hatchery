export interface JwtUser {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}
