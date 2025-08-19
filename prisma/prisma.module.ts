
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService], // makes PrismaService available in this module
  exports: [PrismaService],   // allows other modules to use PrismaService
})
export class PrismaModule {}
