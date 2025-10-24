// src/modules/aesthetics/aesthetics.module.ts
import { Module } from '@nestjs/common';
import { AestheticsController } from './aesthetics.controller';
import { AestheticsService } from './aesthetics.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [AestheticsController],
  providers: [AestheticsService, PrismaService],
  exports: [AestheticsService],
})
export class AestheticsModule {}
