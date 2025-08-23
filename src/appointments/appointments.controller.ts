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
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  PublicBookAppointmentDto,
  UpdateAppointmentDto,
} from './appointment.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOperation({ summary: 'Staff booking for a patient' })
  @ApiBearerAuth('JWT-auth')
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
  @Get()
  async findAll(@Query() query: any) {
    return this.appointmentsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get all appointments for logged in patient' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard) // 👈 protect with JWT
  @Get('me')
  @Roles(Role.PATIENT)
  async findAllForMe(@Request() Request: any) {
    return this.appointmentsService.findAllForMe(Request.user.userId);
  }

  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update appointment (status, reschedule, reason)' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.updateAppointment(id, dto);
  }

  @ApiOperation({ summary: 'Approve appointment' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.appointmentsService.approve(id);
  }

  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }

  @ApiOperation({ summary: 'Complete appointment' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id/complete')
  async complete(@Param('id') id: string) {
    return this.appointmentsService.complete(id);
  }
}
