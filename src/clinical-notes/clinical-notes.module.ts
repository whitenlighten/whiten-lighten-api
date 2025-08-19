import { Module } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { ClinicalNotesController } from './clinical-notes.controller';

@Module({
  providers: [ClinicalNotesService],
  controllers: [ClinicalNotesController]
})
export class ClinicalNotesModule {}
