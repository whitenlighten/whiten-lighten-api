import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PatientService } from './patients.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CreatePatientDto,
  UpdatePatientDto,
} from './dto/create-patient..dto';
import { PatientResponseDto } from './dto/patient-rsponse.dto';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  /**
   * Create a new patient
   */



  @Post('pre-registration')
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({
    status: 201,
    description: 'Patient created successfully',
    type: PatientResponseDto,
  })
  async preReg(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.createPreRegistration(createPatientDto);
  }

  @Post(':promoteReg')
  @ApiResponse({
    status: 200,
    description: 'Pre-registration promoted successfully',
    type: PatientResponseDto,
  })
  async promotePreRegistration(
    @Param('preRegId') preRegId: string,
    @Body('staffId') staffId: string,
  ) {
    return this.patientService.promotePreRegistration(preRegId, staffId);
  }


  
  @Post()
  @ApiBody({ type: CreatePatientDto })
  @ApiResponse({
    status: 201,
    description: 'Patient created successfully',
    type: PatientResponseDto,
  })
  async create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.createPatient(createPatientDto);
  }

  /**
   * Get all patients with optional pagination
   */
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of patients',
    type: [PatientResponseDto],
  })
  async getAllPatient(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.patientService.getAllPatients(page, limit);
  }

  /**
   * Get a patient by ID
   */
  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Patient fetched successfully',
    type: PatientResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.patientService.getPatientById(id);
  }

  /**
   * Update an existing patient
   */
  @Put(':id')
  @ApiBody({ type: UpdatePatientDto })
  @ApiResponse({
    status: 200,
    description: 'Patient updated successfully',
    type: PatientResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientService.updatePatient(id, updatePatientDto);
  }

  /**
   * Soft delete a patient
   */
  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Patient deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.patientService.deletePatient(id);
  
}
}
