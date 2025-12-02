import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// Simple non-cryptographic hash for scrambling sequential numbers
function hash32(x: number): number {
  x = x ^ 61 ^ (x >>> 16);
  x = x + (x << 3);
  x = x ^ (x >>> 4);
  x = x * 0x27d4eb2d;
  x = x ^ (x >>> 15);
  return x >>> 0;
}

function encodeBase32(num: number): string {
  let encoded = '';
  for (let i = 0; i < 5; i++) {
    encoded = BASE32[num % 32] + encoded;
    num = Math.floor(num / 32);
  }
  return encoded;
}

export async function generateSystemId(role: 'PATIENT' | 'DOCTOR' | 'NURSE') {
  const PREFIX = {
    PATIENT: 'WLP',
    DOCTOR: 'WLD',
    NURSE: 'WLN',
  }[role];

  // Atomic increment per role
  const counter = await prisma.idCounter.upsert({
    where: { role },
    update: { value: { increment: 1 } },
    create: { role, value: 1 },
  });

  const mixed = hash32(counter.value);
  const encoded = encodeBase32(mixed);

  return `${PREFIX}${encoded}`;
}
