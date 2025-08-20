import { Module } from '@nestjs/common';

import { PatientsController } from './patients.controller';
import { PatientService } from './patients.service';

@Module({
  providers: [PatientService],
  controllers: [PatientsController]
})
export class PatientsModule {}
