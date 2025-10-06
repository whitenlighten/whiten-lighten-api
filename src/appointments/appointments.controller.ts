import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateAppointmentDto,
  PublicBookAppointmentDto,
  UpdateAppointmentDto,
  QueryAppointmentsDto,
} from './appointment.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({ summary: 'Staff booking for a patient' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @Post()
  async create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Public appointment booking (self-register + appointment)' })
  @Post('public-book')
  async publicBook(@Body() dto: PublicBookAppointmentDto) {
    return this.appointmentsService.publicBook(dto);
  }

  @ApiOperation({ summary: 'Get all appointments (filterable)' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @Get()
  async findAll(@Query() query: QueryAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get all appointments for logged in patient' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard) // 👈 protect with JWT
  @Get('me')
  @Roles(Role.PATIENT, Role.SUPERADMIN)
  async findAllForMe(@Request() Request: any) {
    return this.appointmentsService.findAllForMe(Request.user.userId);
  }

  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update appointment (status, reschedule, reason)' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE)  
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.updateAppointment(id, dto);
  }

  



  @ApiOperation({ summary: 'Approve appointment' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR) 
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.appointmentsService.approve(id);
  }

  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)  
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @ApiOperation({ summary: 'Complete appointment' })
  @ApiBearerAuth('JWT-auth')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR) 
  @Patch(':id/complete')
  async complete(@Param('id') id: string) {
    return this.appointmentsService.complete(id);
  }
}
