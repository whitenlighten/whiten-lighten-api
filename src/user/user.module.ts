/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
