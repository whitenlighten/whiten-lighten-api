// src/modules/ent/ent.module.ts
import { Module } from '@nestjs/common';
import { EntController } from './ent.controller';
import { EntService } from './ent.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [EntController],
  providers: [EntService, PrismaService],
  exports: [EntService],
})
export class EntModule {}
