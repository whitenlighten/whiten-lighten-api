import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PatientsModule } from '../patients/patients.module';
import { PrismaService } from 'prisma/prisma.service';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [PatientsModule, AuditTrailModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
