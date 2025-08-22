import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService, MailService],
  exports: [PatientsService],
})
export class PatientsModule {}
