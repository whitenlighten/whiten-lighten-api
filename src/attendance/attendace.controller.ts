import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';


// Import DTOs

// Assuming AttendanceService import is correct
import { AttendanceService } from './attendance.service';
import { ClientStatusDto, PaginationQueryDto, StaffClockDto } from './attendance.dto';

@ApiTags('attendance') // Group all endpoints under 'attendance'
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // POST /attendance/staff
  @ApiOperation({ summary: 'Clock staff IN or OUT' })
  @ApiBody({ type: StaffClockDto, description: 'Staff ID and clock action' })
  @ApiOkResponse({ description: 'Clock-in/out successful.' })
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @Post('staff')
  async clockInOut(@Body() dto: StaffClockDto) {
    return this.attendanceService.staffClock(dto);
  }

  // POST /attendance/client/:appointmentId
  @ApiOperation({ summary: 'Mark client attendance for an appointment' })
  @ApiParam({
    name: 'appointmentId',
    description: 'The ID of the client appointment.',
    type: 'string',
    example: 'appt-uuid-999',
  })
  @ApiBody({ type: ClientStatusDto, description: 'Client attendance status' })
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @Post('client/:appointmentId')
  async markClientAttendance(
    @Param('appointmentId') id: string,
    @Body() dto: ClientStatusDto,
  ) {
    return this.attendanceService.clientAttendance(id, dto.status);
  }

  // GET /attendance/staff
  @ApiOperation({ summary: 'Get paginated staff attendance history' })
  // Use the DTO for query parameters
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @Get('staff')
  async getStaffAttendance(@Query() query: PaginationQueryDto) {
    // You must now use query.page and query.limit
    return this.attendanceService.getStaffAttendance(
      query.page,
      query.limit,
    );
  }

  // GET /attendance/clients
  @ApiOperation({ summary: 'Get paginated client attendance history' })
  // Use the DTO for query parameters
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @Get('clients')
  async getClientAttendance(@Query() query: PaginationQueryDto) {
    // You must now use query.page and query.limit
    return this.attendanceService.getClientAttendance(
      query.page,
      query.limit,
    );
  }
}