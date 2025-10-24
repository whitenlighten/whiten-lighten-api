// src/modules/iv-therapy/iv-therapy.module.ts
import { Module } from '@nestjs/common';
import { IvTherapyController } from './iv-therapy.controller';
import { IvTherapyService } from './iv-therapy.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [IvTherapyController],
  providers: [IvTherapyService, PrismaService],
  exports: [IvTherapyService],
})
export class IvTherapyModule {}
