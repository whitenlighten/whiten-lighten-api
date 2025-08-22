/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNotesController } from './clinical-notes.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService, PrismaService],
  exports: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
