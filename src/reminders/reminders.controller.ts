import { Body, Controller, Get, Post, Query, UseGuards, Param } from '@nestjs/common';
import { CreateReminderDto, ReminderQueryDto } from './reminders.dto';
import { RemindersService } from './reminders.services';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('reminder')
@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @ApiOperation({ summary: 'Create Reminder and link to an entity' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE)
  // 👈 Define the path parameter ':id' in the @Post decorator
  @Post(':id') 
  async create(
    @Param('id') id: string, // Extracts the 'id' from the URL path
    @Body() dto: CreateReminderDto, 
  ) {
    // Passes the entity ID and the reminder data to the service
    return this.remindersService.create(id, dto);
  }

  @ApiOperation({ summary: 'Get All Reminders with Pagination' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE)
  @Get()
  // 👈 Corrected the method name to be just 'findAll' and passed query to service
  async findAll(@Query() query: ReminderQueryDto) {
    // Assumes ReminderQueryDto has page and limit properties
    return this.remindersService.findAll(query.page, query.limit);
  }
}