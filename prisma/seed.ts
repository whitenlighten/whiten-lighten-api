// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.SUPERADMIN_EMAIL || 'Superadminfire@gmail.com';
  const rawPassword = process.env.SUPERADMIN_PASSWORD || 'Rice&Yam911';

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
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
          phone: '0000000000', 
        },
      });
      console.log('✅ Superadmin seeded:', email);
    } else {
      console.log('ℹ️ Superadmin already exists:', email);
    }
  } catch (err: any) {
    if (err.code === 'P2021') {
      console.error('❌ User table does not exist. Did you run migrations?');
    } else {
      throw err;
    }
  }

  try {
    await prisma.patientCounter.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, value: 0 },
    });
    console.log('✅ patientCounter seeded');
  } catch (err: any) {
    console.error('❌ Failed to seed patientCounter:', err);
  }
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
