// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.SUPERADMIN_EMAIL || 'Superadminfire@gmail.com';
  const rawPassword = process.env.SUPERADMIN_PASSWORD || 'Rice&Yam911';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Superadmin already exists:', email);
    return;
  }

  const hashed = await bcrypt.hash(rawPassword, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('Superadmin seeded:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // no explicit disconnect to make script safe in different environments
    process.exit(0);
  });
