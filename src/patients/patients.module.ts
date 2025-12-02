import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from 'src/notification/notifications.module';
import { PatientsController } from './patients.controller';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [NotificationsModule, AuditTrailModule],
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService],
  exports: [PatientsService],
})
export class PatientsModule {}
