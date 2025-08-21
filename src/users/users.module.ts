// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, MailService],
  exports: [UsersService],
})
export class UsersModule {}
