import { Module } from '@nestjs/common';
import { AuditTrailController } from './audit-trail.controller';
import { PrismaService } from 'prisma/prisma.service';
import { AuditTrailService } from './auditTrail.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule], // <-- ADD IT HERE
  controllers: [AuditTrailController],
  providers: [AuditTrailService, PrismaService],
  exports: [AuditTrailService],
})
export class AuditTrailModule {}
