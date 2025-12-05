// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || 'Superadmin@gmail.com';
  const rawPassword = process.env.SUPERADMIN_PASSWORD || 'Password4Admin1';
  // const email = process.env.SUPERADMIN_EMAIL || 'sprinterAlhpa@echo.com';
  // const rawPassword = process.env.SUPERADMIN_PASSWORD || '2wH0@2!t5L@$enIg11.h2$enten!';

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
          staffCode: 'SA001', // Add a staff code for the superadmin
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
    // Disconnect Prisma Client
    await prisma.$disconnect();
  });
