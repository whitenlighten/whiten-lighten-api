// prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ✅ optional but makes it available everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService],  // ✅ must export it
})
export class PrismaModule {}
