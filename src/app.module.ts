import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { MailService } from './utils/mail.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClinicalNotesModule } from './clinical-notes/clinical-notes.module';
import { BillingModule } from './billing/billing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersModule } from './reminders/reminders.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DentalModule } from './dental/dental.module';
import { EntModule } from './ent/ent.module';
import { AestheticsModule } from './aesthetics/aesthetics.module';
import { IvTherapyModule } from './iv-therapy/iv-therapy.module';
import { NotificationsModule } from './notification/notifications.module';
import { AuditTrailModule } from './audit-trail/audit-trail.module';
import { TasksModule } from './task/task.module';
;

@Global() // 👈 makes MailService available app-wide
@Module({
  providers: [MailService],
  exports: [MailService],
  // No controllers or imports are needed here for a simple global service module
})
export class MailModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      
    }),
    EventEmitterModule.forRoot(), // ✅ Initialize EventEmitter globally
    ScheduleModule.forRoot(),
    AuthModule,
    PrismaModule,
    MailModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    BillingModule, // ✅ Add BillingModule here
    ClinicalNotesModule,
    RemindersModule,
    AttendanceModule,
    DentalModule,
    EntModule,
    AestheticsModule,
   IvTherapyModule,
   NotificationsModule,
   AuditTrailModule,
   TasksModule,
   
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Enforce authentication
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Enforce roles
    },
  ],
})
export class AppModule {}
