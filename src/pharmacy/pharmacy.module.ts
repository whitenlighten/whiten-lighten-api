import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyItemController } from './pharmacy.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [PrismaModule, AuditTrailModule], // Import necessary modules
  controllers: [PharmacyItemController], // Declare the controller
  providers: [PharmacyService], // Declare the service as a provider
  exports: [PharmacyService], // Export if other modules need to inject PharmacyService
})
export class PharmacyModule {}