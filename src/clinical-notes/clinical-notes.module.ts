import { Module } from '@nestjs/common';
import { ClinicalNotesController } from './clinical-notes.controller';
import { ClinicalNotesService } from './clinical-notes.service';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService, PrismaService, MailService],
})
export class ClinicalNotesModule {}
