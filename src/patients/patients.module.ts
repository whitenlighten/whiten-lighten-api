import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from 'src/notification/notifications.module';
import { PatientsController } from './patients.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService],
  exports: [PatientsService],
})
export class PatientsModule {}
