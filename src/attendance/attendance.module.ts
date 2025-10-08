import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from 'prisma/prisma.service';
import { AttendanceController } from './attendace.controller';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, PrismaService],
})
export class AttendanceModule {}
