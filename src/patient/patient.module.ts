
import { Module } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { PatientsController } from './patient.controller';
import { PatientsService } from './pateient.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PrismaService],
  exports: [PatientsService],
})
export class PatientsModule {}
