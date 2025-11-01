import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, QueryNotificationDto } from './notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // ⬅️ ASSUMED
import { Roles } from '../auth/decorator/roles.decorator'; // ⬅️ ASSUMED
import { GetUser } from 'src/common/decorator/get-user.decorator'; // ⬅️ ASSUMED
import { Role } from '@prisma/client'; // ⬅️ ASSUMED

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // 1. CREATE: Strictly restricted to internal/admin roles.
  @Post()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new notification (Admin/Internal use only)' })
  create(@Body() dto: CreateNotificationDto) {
    // The user context might be needed in the service for logging/auditing
    return this.notificationsService.create(dto); 
  }

  // 2. LIST: Logic remains combined, but uses cleaner decorator syntax.
  @Get()
  @UseGuards(RolesGuard) // Apply RolesGuard specifically to this method
  @ApiOperation({ summary: 'Get all notifications for the user (Contextual Patient/Admin list)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'read', required: false })
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE, Role.PATIENT)
  findAll(
    @GetUser('role') role: Role,
    @GetUser('patientId') patientId: string,
    @GetUser() user: any, // Pass entire user object for Admin/Staff findAll
    @Query() query: QueryNotificationDto,
  ) {
    console.log('--- HIT /notifications endpoint ---');
    console.log('User object from token:', user);
    console.log(`Role: ${role}, Patient ID: ${patientId}`);
    if (role === Role.PATIENT) {
      // NOTE: Ensure patientId is passed correctly (it must exist for PATIENT role)
      return this.notificationsService.findAllForPatient(patientId, query); 
    }
    // All other roles (ADMIN, DOCTOR, etc.) get the Admin/Staff view
    return this.notificationsService.findAllForAdmin(query, user);
  }
 
  // 3. MARK AS READ: Uses GetUser for cleaner data access.
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.markAsRead(id, user);
  }

  // 4. DELETE: Strictly restricted to Admin roles.
  @Delete(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete notification (Admin only)' })
  delete(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.delete(id, user);
  }
}