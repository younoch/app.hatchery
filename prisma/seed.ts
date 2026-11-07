import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Default templates (AGENTS.md -> RBAC). Org-level keys only.
const ROLE_TEMPLATES: Record<string, string[]> = {
  admin: [
    'user:create',
    'user:read',
    'user:write',
    'user:reset-password',
    'organization-role:write',
    'tank:create',
    'tank:write',
    'reading:create',
    'reading:read-all',
  ],
  manager: [
    'user:read',
    'tank:create',
    'tank:write',
    'reading:create',
    'reading:read-all',
  ],
  staff: ['reading:create'],
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to run the seed`);
  return value;
}

async function seedRoles() {
  for (const [name, permissions] of Object.entries(ROLE_TEMPLATES)) {
    await prisma.role.upsert({
      where: { name },
      update: { permissions },
      create: { name, permissions },
    });
  }
}

async function seedSuperAdmin() {
  const username = required('SEED_SUPER_ADMIN_USERNAME').trim().toLowerCase();
  const email = required('SEED_SUPER_ADMIN_EMAIL').trim();
  const password = required('SEED_SUPER_ADMIN_PASSWORD');

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error('SEED_SUPER_ADMIN_USERNAME is invalid');
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD needs 8+ characters with a letter and a number',
    );
  }

  const existing = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
  });
  if (existing) {
    console.log(`Super admin already exists (${existing.username}); untouched.`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 10),
      isSuperAdmin: true,
      mustChangePassword: false,
      emailVerified: true,
    },
  });
  console.log(`Super admin created: ${username}`);
}

async function main() {
  await seedRoles();
  await seedSuperAdmin();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());