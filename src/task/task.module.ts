// src/modules/tasks/tasks.module.ts

import { Module } from '@nestjs/common';

import { TasksService } from './tasks.service';

// Assuming these services are provided globally or imported from their respective modules
import { PrismaService } from 'prisma/prisma.service'; 
import { AuditTrailService } from 'src/audit-trail/auditTrail.service'; 
import { TasksController } from './task.controller';

@Module({
  imports: [
  ],
  controllers: [TasksController],
  providers: [
    TasksService, 
    PrismaService, // Often provided globally, but listed here for clarity
    AuditTrailService, // Often provided globally, but listed here for clarity
  ],
  // If other modules need to use TasksService (e.g., a DashboardModule)
  exports: [TasksService], 
})
export class TasksModule {}