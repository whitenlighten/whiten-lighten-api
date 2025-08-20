// src/patients/patients.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PatientService } from './patients.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient..dto';
import { PatientResponseDto } from './dto/patient-rsponse.dto';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Patient created successfully', type: PatientResponseDto })
  async create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.createPatient(createPatientDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List of patients', type: [PatientResponseDto] })
  async findAll() {
    return this.patientService.getAllPatients();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Patient fetched successfully', type: PatientResponseDto })
  async findOne(@Param('id') id: string) {
    return this.patientService.getPatientById(id);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'Patient updated successfully', type: PatientResponseDto })
  async update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientService.updatePatient(id, updatePatientDto);
  }

  @Post('pre-registration/:id/promote')
  @ApiResponse({ status: 201, description: 'Pre-registration promoted successfully', type: PatientResponseDto })
  async promotePreRegistration(@Param('id') preRegistrationId: string, @Req() req: any) {
    const staffId = req.user.id; // Assuming JWT adds `user` to request
    return this.patientService.promotePreRegistration(preRegistrationId, staffId);
  }
}
