import { Module } from '@nestjs/common';
import { DentalController } from './dental.controller';
import { PrismaService } from 'prisma/prisma.service';
import { DentalService } from './dental.services';

@Module({
  controllers: [DentalController],
  providers: [DentalService, PrismaService],
  exports: [DentalService],
})
export class DentalModule {}
