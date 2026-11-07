export interface UserResponseSource {
  id: string;
  username: string;
  email: string;
  name: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  organizationId: string | null;
  createdAt: Date;
  role: { id: string; name: string } | null;
}

export function toUserResponse(user: UserResponseSource) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    organizationId: user.organizationId,
    role: user.role ? { id: user.role.id, name: user.role.name } : null,
    createdAt: user.createdAt,
  };
}
