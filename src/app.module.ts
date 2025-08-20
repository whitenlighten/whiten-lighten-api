import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { PatientsModule } from './patients/patients.module';
import { MedicalRecordsModule } from './medical record/medicalRecord.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    AuthModule,
    PrismaModule,
    PatientsModule,         // 👈 add this
    MedicalRecordsModule,   // 👈 and this
  ],
})
export class AppModule {}
