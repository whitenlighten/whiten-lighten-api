// src/modules/tasks/tasks.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, QueryTasksDto } from './tasks.dto';

import { Role } from '@prisma/client'; // Assuming Role enum is available
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Protects all endpoints in this controller
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // --------------------------------------------------
  // 1. CREATE TASK
  // --------------------------------------------------
  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK) // Only authorized staff can create tasks
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'The task has been successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Related User, Patient, or Appointment not found.' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: any, // Injects the authenticated user object
  ) {
    return this.tasksService.create(createTaskDto, user);
  }

  // --------------------------------------------------
  // 2. LIST TASKS
  // --------------------------------------------------
  @Get()
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.PATIENT) // Most roles need to view their tasks
  @ApiOperation({ summary: 'Retrieve a paginated list of tasks with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: 'A list of tasks.' })
  async findAll(
    @Query() query: QueryTasksDto,
    @GetUser() user: any,
  ) {
    // Note: Security filtering (RBAC) is handled inside the service layer
    return this.tasksService.findAll(query, user);
  }

  // --------------------------------------------------
  // 3. GET SINGLE TASK
  // --------------------------------------------------
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.PATIENT)
  @ApiOperation({ summary: 'Retrieve a single task by ID' })
  @ApiResponse({ status: 200, description: 'The task details.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not assigned, created, or related to the patient).' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.tasksService.findOne(id, user);
  }

  // --------------------------------------------------
  // 4. UPDATE TASK
  // --------------------------------------------------
  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK) // Patient cannot update tasks
  @ApiOperation({ summary: 'Update a task (partial content)' })
  @ApiResponse({ status: 200, description: 'The task has been successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not assigned or created).' })
  @ApiResponse({ status: 404, description: 'Task or related entity not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  // --------------------------------------------------
  // 5. MARK COMPLETE (Helper Endpoint)
  // --------------------------------------------------
  @Post(':id/complete')
  @HttpCode(200) // Returns 200 OK for a successful operation (not 201 created)
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)
  @ApiOperation({ summary: 'Mark a task as C02OMPLETED' })
  @ApiResponse({ status: 200, description: 'Task status updated to COMPLETED.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async complete(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.tasksService.complete(id, user);
  }

  // --------------------------------------------------
  // 6. DELETE TASK
  // --------------------------------------------------
  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN) // Deletion is restricted to high-privilege roles
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'The task has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden (insufficient role).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async remove(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.tasksService.remove(id, user);
  }
}