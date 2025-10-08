import { Module } from '@nestjs/common';
import { RemindersController } from './reminders.controller';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';
import { RemindersService } from './reminders.services';

@Module({
  controllers: [RemindersController],
  providers: [RemindersService, PrismaService, MailService],
})
export class RemindersModule {}
