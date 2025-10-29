import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AuditTrailModule } from 'src/audit-trail/audit-trail.module';

@Module({
  imports: [AuditTrailModule], // Import the module that exports AuditTrailService
  controllers: [NotificationsController],
  providers: [NotificationsService], // PrismaService is global, no need to provide it here
  exports: [NotificationsService],
})
export class NotificationsModule {}
 