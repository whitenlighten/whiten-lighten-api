import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PatientsService } from './patients.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { CreatePatientDto, QueryPatientsDto, UpdatePatientDto } from './patients.dto';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/common/decorator/public.decorator';

@ApiTags('patients')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // =====================
  // 1. FRONTDESK/ADMIN/DOCTOR create full patient profile
  // =====================
  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Create patient (staff only)' })
  @ApiResponse({ status: 201, description: 'Patient created successfully.' })
  async createPatient(@Body() dto: CreatePatientDto, @GetUser('id') createdBy: string) {
    return this.patientsService.create(dto, createdBy);
  }

  // =====================
  // 2. SELF REGISTER patient (basic info, status=PENDING)
  // =====================
  @Public()
  @Post('self-register') // anyone not logged in could also use, but if logged in as patient
  @ApiOperation({ summary: 'Self-register as patient (pending approval)' })
  @ApiResponse({
    status: 201,
    description: 'Patient self-registered (PENDING).',
  })
  async selfRegister(@Body() dto: CreatePatientDto) {
    return this.patientsService.selfRegister(dto);
  }

  // =====================
  // 3. Approve patient (any staff except Patient)
  // =====================
  @Patch(':patientId/approve')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve self-registered patient' })
  async approvePatient(
    @Param('patientId') patientId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const approver = req.user; // <-- comes from JwtStrategy.validate()
    return this.patientsService.approve(patientId, approver);
  }

  // =====================
  // 4. List patients (staff only)
  // =====================
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE)
  @ApiOperation({ summary: 'List patients (staff only)' })
  async getPatients(@Query() query: QueryPatientsDto, @GetUser() user: any) {
    return this.patientsService.findAll(query, user);
  }

  // =====================
  // 5. Get patient by ID (staff can view full profile, patient can only view self)
  // =====================
  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.PATIENT)
  @ApiOperation({ summary: 'Get patient by ID' })
  async getPatient(@Param('id') id: string, @GetUser() user: any) {
    return this.patientsService.findOne(id, user);
  }

  // =====================
  // 6. Get patient by patientId (staff can view full profile, patient can only view self)
  // =====================
  @Get('/one/:patientId')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.PATIENT)
  @ApiOperation({ summary: 'Get patient by patientId' })
  async getPatientId(@Param('patientId') patientId: string, @GetUser() user: any) {
    return this.patientsService.findOneByPatientId(patientId, user);
  }

  // =====================
  // 7. Update patient details (Frontdesk/Admin only)
  // =====================
  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.FRONTDESK)
  @ApiOperation({ summary: 'Update patient details (staff only)' })
  async updatePatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @GetUser('id') updatedBy: string,
  ) {
    return this.patientsService.update(id, dto, updatedBy);
  }

  // =====================
  // 8. Delete (archive) patient (Admin only)
  // =====================
  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Archive patient (Admin only)' })
  async archivePatient(@Param('id', ParseUUIDPipe) id: string, @GetUser('id') deletedBy: string) {
    return this.patientsService.archive(id, deletedBy);
  }

  // =====================
  // 9. Patient’s appointment history
  // =====================
  @Get(':id/appointments')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.PATIENT)
  @ApiOperation({ summary: "Get patient's appointment history" })
  async getPatientAppointments(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: any) {
    return this.patientsService.findAppointments(id, user);
  }
}
