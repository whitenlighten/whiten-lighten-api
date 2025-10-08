import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { BillingService } from './billing/billing.service';
import { BillingController } from './billing/billing.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersModule } from './reminders/reminders.module';
import { AttendanceModule } from './attendance/attendance.module';
;

@Global() // 👈 makes MailService available app-wide
@Module({
  providers: [MailService, BillingService],
  exports: [MailService],
  imports: [BillingModule],
  controllers: [BillingController], // 👈 export so other modules can inject it
})
export class MailModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    PrismaModule,
    MailModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    ClinicalNotesModule,
    RemindersModule,
    AttendanceModule
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
