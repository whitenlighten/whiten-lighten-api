import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { MedicalRecordService } from './medicalRecordService';
import { MedicalRecordController } from './medicalRecord.controller';

@Module({
  imports: [PrismaModule],
  providers: [MedicalRecordService],
  controllers: [MedicalRecordController],
  exports: [MedicalRecordService],
})
export class MedicalRecordModule {}
