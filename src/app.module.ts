import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { MailService } from './utils/mail.service';

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
  ],
})
export class AppModule {}
