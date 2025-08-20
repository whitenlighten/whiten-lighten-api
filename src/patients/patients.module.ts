// patients/patients.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { PatientService } from './patients.service';
import { PatientController } from './patients.controller';

@Module({
  imports: [PrismaModule], // 👈 gives access to PrismaService
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientsModule {}
