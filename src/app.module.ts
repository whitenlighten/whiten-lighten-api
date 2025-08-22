import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { MailService } from './utils/mail.service';
import { ClinicalNotesModule } from './clinical-note/clinical-notes.module';
import { PatientsModule } from './patient/patient.module';
import { UsersModule } from './user/user.module';

@Global() // 👈 makes MailService available app-wide
@Module({
  providers: [MailService],
  exports: [MailService], // 👈 export so other modules can inject it
})
export class MailModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    PrismaModule,
    MailModule,
    UsersModule,
    ClinicalNotesModule,
    PatientsModule,
  ],
})
export class AppModule {}
