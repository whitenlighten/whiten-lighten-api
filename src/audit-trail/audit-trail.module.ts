import { Module } from '@nestjs/common';
import { AuditTrailController } from './audit-trail.controller';
import { PrismaService } from 'prisma/prisma.service';
import { AuditTrailService } from './auditTrail.service';

@Module({
  controllers: [AuditTrailController],
  providers: [AuditTrailService, PrismaService],
  exports: [AuditTrailService],
})
export class AuditTrailModule {}
