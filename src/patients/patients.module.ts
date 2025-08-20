import { Module } from '@nestjs/common';

import { PatientService } from './patients.service';
import { PatientController } from './patients.controller';

@Module({
  providers: [PatientService],
  controllers: [PatientController]
})
export class PatientsModule {}
