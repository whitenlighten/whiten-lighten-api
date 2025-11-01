// billing.module.ts
import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [PrismaModule, AuditTrailModule],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
