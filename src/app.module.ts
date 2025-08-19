import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ Makes ConfigModule available globally
      envFilePath: '.env', // ✅ Explicitly specify .env file
    }),
    UsersModule,
    AuthModule,
    PrismaModule,
  ],
})
export class AppModule {}