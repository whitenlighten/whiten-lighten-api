// src/modules/tasks/tasks.service.ts

import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTaskDto, UpdateTaskDto, QueryTasksDto } from './tasks.dto';
import { Role } from '@prisma/client'; // Assuming Role enum is available
import { AuditTrailService } from 'src/audit-trail/auditTrail.service';

/**
 * TasksService - handles CRUD, audit logging, and security checks.
 */

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditTrailService: AuditTrailService, // ⬅️ NEW: Injected Audit Service
  ) {}
  
  // --------------------------------------------------
  // 1. CREATE TASK
  // --------------------------------------------------
  async create(dto: CreateTaskDto, user: any) { // ⬅️ Changed to take full user object
    try {
      // ⚡ REFACTOR: Check existence of assigned user and related patient/appointment
      await this.assertRelatedEntitiesExist(dto);

      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

      const task = await this.prisma.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          dueDate: dueDate ?? undefined,
          assignedToId: dto.assignedToId ?? undefined,
          relatedPatientId: dto.relatedPatientId ?? undefined,
          relatedAppointmentId: dto.relatedAppointmentId ?? undefined,
          createdById: user.id,
        },
      });

      // 🛡️ AUDIT LOG: Task Creation
      await this.auditTrailService.log(
        'TASK_CREATED',
        'Task',
        task.id,
        user,
        { title: task.title, assignedToId: task.assignedToId, patientId: task.relatedPatientId }
      );

      this.eventEmitter.emit('task.created', { taskId: task.id, createdById: user.id });

      return task;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('Failed to create task', err.stack || err);
      throw new InternalServerErrorException('Could not create task');
    }
  }

  // --------------------------------------------------
  // 2. LIST TASKS
  // --------------------------------------------------
  async findAll(query: QueryTasksDto, user: any) { // ⬅️ NEW: Added user for security filtering
    try {
      const page = Math.max(query.page || 1, 1);
      const limit = Math.min(Math.max(query.limit || 20, 1), 200);
      const skip = (page - 1) * limit;

      const where: any = {};
      
      // 🛡️ SECURITY: Apply role-based visibility filtering
      if (user.role === Role.PATIENT) {
          // Patient can only see tasks related to them
          where.relatedPatientId = user.patientId; // Assuming user.patientId holds the patient link
      } else if (user.role === Role.DOCTOR || user.role === Role.NURSE) {
          // Clinical staff see tasks assigned to them, unless explicitly filtering otherwise
          if (!query.assignedToId) {
             where.OR = [
                 { assignedToId: user.id },
                 // Optionally: Tasks they created, if not assigned to anyone else
                 { createdById: user.id, assignedToId: null } 
             ];
          }
      }

      // Apply standard filters (can override default role filters if user is ADMIN)
      if (query.status) where.status = query.status;
      if (query.assignedToId) where.assignedToId = query.assignedToId;
      if (query.q) {
        where.OR = [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await this.prisma.$transaction([
        this.prisma.task.count({ where }),
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dueDate: 'asc', createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
            relatedPatient: { select: { id: true, firstName: true, lastName: true, patientId: true, phone: true, email: true } },
          },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (err: any) {
      this.logger.error('Failed to list tasks', err.stack || err);
      throw new InternalServerErrorException('Could not retrieve tasks');
    }
  }

  // --------------------------------------------------
  // 3. GET SINGLE TASK
  // --------------------------------------------------
  async findOne(id: string, user: any) { // ⬅️ NEW: Added user for security check
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
          relatedPatient: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!task) throw new NotFoundException('Task not found');

      // 🛡️ SECURITY: Enforce view restrictions
      const isAdminOrCreator = [Role.ADMIN, Role.SUPERADMIN].includes(user.role) || task.createdById === user.id;
      const isAssigned = task.assignedToId === user.id;
      const isRelatedPatient = user.role === Role.PATIENT && task.relatedPatientId === user.patientId;

      if (!isAdminOrCreator && !isAssigned && !isRelatedPatient) {
          throw new ForbiddenException('You are not authorized to view this task.');
      }

      return task;
    } catch (err) {
      this.logger.error('Failed to get task', err);
      throw err;
    }
  }

  // --------------------------------------------------
  // 4. UPDATE TASK (Core logic for both update and complete)
  // --------------------------------------------------
  async update(id: string, dto: UpdateTaskDto, user: any) { // ⬅️ Changed actorId to user object
    try {
      const existing = await this.prisma.task.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Task not found');

      // 🛡️ SECURITY: Enforce update restrictions
      const isAuthorized = [Role.ADMIN, Role.SUPERADMIN].includes(user.role) ||
                           existing.assignedToId === user.id ||
                           existing.createdById === user.id;
      if (!isAuthorized) {
          throw new ForbiddenException('You are not authorized to update this task.');
      }
      
      // ⚡ REFACTOR: Check if any relationship is being updated and assert its existence
      if (dto.assignedToId !== undefined || (dto as CreateTaskDto).relatedPatientId !== undefined) {
          await this.assertRelatedEntitiesExist(dto as CreateTaskDto);
      }

      const oldData = { ...existing };
      
      // Build dataToUpdate dynamically
      const dataToUpdate: any = {};
      Object.keys(dto).forEach(key => {
          if (dto[key] !== undefined) {
              dataToUpdate[key] = key === 'dueDate' && dto[key] !== null 
                  ? new Date(dto[key]) 
                  : dto[key];
          }
      });
      
      const updated = await this.prisma.task.update({ where: { id }, data: dataToUpdate });

      // 🛡️ AUDIT LOG: Task Update
      const changes = Object.keys(dto).reduce((acc, key) => {
        if (dto[key] !== oldData[key]) {
          acc[key] = { oldValue: oldData[key], newValue: dto[key] };
        }
        return acc;
      }, {});
      
      await this.auditTrailService.log(
        'TASK_UPDATED',
        'Task',
        updated.id,
        user,
        changes
      );

      this.eventEmitter.emit('task.updated', { taskId: id, actorId: user.id });

      return updated;
    } catch (err: any) {
      this.logger.error('Failed to update task', err.stack || err);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Could not update task');
    }
  }

  // --------------------------------------------------
  // 5. MARK COMPLETE (Helper method using core update)
  // --------------------------------------------------
  async complete(id: string, user: any) { // ⬅️ Changed actorId to user object
    // ⚡ REFACTOR: Use the core update logic to minimize redundancy (DRY principle)
    return this.update(id, { status: 'COMPLETED' }, user);
  }

  // --------------------------------------------------
  // 6. DELETE TASK
  // --------------------------------------------------
  async remove(id: string, user: any) { // ⬅️ NEW: Added user for audit and security check
    try {
      const existing = await this.prisma.task.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Task not found');

      // 🛡️ SECURITY: Deletion typically restricted to high roles
      if (![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
          throw new ForbiddenException('You are not authorized to delete tasks.');
      }
      
      await this.prisma.task.delete({ where: { id } });
      
      // 🛡️ AUDIT LOG: Task Deletion
      await this.auditTrailService.log(
          'TASK_DELETED',
          'Task',
          id,
          user,
          { title: existing.title }
      );
      
      this.eventEmitter.emit('task.deleted', { taskId: id });
      return { message: 'Deleted' };
    } catch (err: any) {
      this.logger.error('Failed to delete task', err.stack || err);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Could not delete task');
    }
  }
  
  // --------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------

  /** Asserts that related entities (User, Patient, Appointment) exist if IDs are provided. */
  private async assertRelatedEntitiesExist(dto: CreateTaskDto | UpdateTaskDto) {
      if (dto.assignedToId) {
          const assignedUser = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
          if (!assignedUser) {
              throw new NotFoundException(`Assigned user ID ${dto.assignedToId} not found.`);
          }
      }
      if ((dto as CreateTaskDto).relatedPatientId) {
          const patient = await this.prisma.patient.findUnique({ where: { id: (dto as CreateTaskDto).relatedPatientId } });
          if (!patient) {
              throw new NotFoundException(`Related patient ID ${(dto as CreateTaskDto).relatedPatientId} not found.`);
          }
      }
      if ((dto as CreateTaskDto).relatedAppointmentId) {
          const appointment = await this.prisma.appointment.findUnique({ where: { id: (dto as CreateTaskDto).relatedAppointmentId } });
          if (!appointment) {
              throw new NotFoundException(`Related appointment ID ${(dto as CreateTaskDto).relatedAppointmentId} not found.`);
          }
      }
  }
}