/* eslint-disable prettier/prettier */
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
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreatePatientDto } from './dto/createPatient.dto';
import { SelfRegisterPatientDto } from './dto/selfRegister.dto';
import { QueryPatientDto } from './dto/queryPatient.dto';
import { UpdatePatientDto } from './dto/updatePatient.dto';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { PatientsService } from './pateient.service';

@ApiBearerAuth()
@ApiTags('Patients')
@Controller('patients')
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.FRONTDESK,  Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN, Role.NURSE)
  @ApiOperation({ summary: 'Create new patient (staff)' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  async create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Post('self-register')
  @ApiOperation({ summary: 'Self-register a patient (minimal info)' })
  @ApiResponse({ status: 201, description: 'Patient self-registered successfully' })
  async selfRegister(@Body() dto: SelfRegisterPatientDto) {
    return this.patientsService.selfRegister(dto);
  }

  @Get()
   @Roles(Role.FRONTDESK,  Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN, Role.NURSE)
  @ApiOperation({ summary: 'List all patients (with pagination & search)' })
  async getAll(@Query() query: QueryPatientDto) {
    return this.patientsService.findAll(query.page, query.limit, query.search)
  }

  @Get(':id')
 @Roles(Role.FRONTDESK,  Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN, Role.NURSE)
  @ApiOperation({ summary: 'Get single patient details' })
  async getOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.FRONTDESK, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update patient details (complete record)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Post('approve/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a self-registered patient' })
  async approve(@Param('id') id: string) {
    return this.patientsService.approve(id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Delete patient (soft delete)' })
  async delete(@Param('id') id: string) {
    return this.patientsService.delete(id);
  }
}
