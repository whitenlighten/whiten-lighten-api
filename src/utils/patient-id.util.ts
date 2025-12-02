// // src/utils/patient-id.util.ts

// import { PrismaClient } from '@prisma/client';

// const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// const prisma = new PrismaClient();

// export async function generatePatientId(): Promise<string> {
//   // Atomically increment the counter
//   const counter = await prisma.patientCounter.update({
//     where: { id: 1 },
//     data: { value: { increment: 1 } },
//   });

//   let num = counter.value;
//   let encoded = '';

//   for (let i = 0; i < 5; i++) {
//     encoded = CROCKFORD_BASE32[num % 32] + encoded;
//     num = Math.floor(num / 32);
//   }

//   return 'WL' + encoded.padStart(5, '0') + 'PAT';
// }

// export async function getPatientId(): Promise<string> {
//   const patientId = await generatePatientId();
//   return patientId;
// }
