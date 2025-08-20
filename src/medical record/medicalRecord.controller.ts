import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { MedicalRecordService } from './medicalRecordService';

@ApiTags('Medical Records')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('medical-records')
export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  @Post()
  @Roles('Doctor', 'Admin', 'Frontdesk')
  @ApiOperation({ summary: 'Create a new medical record entry' })
  @ApiBody({ type: CreateMedicalRecordDto })
  @ApiResponse({ status: 201, description: 'Medical record entry created successfully.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async create(@Body() dto: CreateMedicalRecordDto) {
    return this.medicalRecordService.createMedicalRecord(dto);
  }

  @Get('patient/:patientId')
  @Roles('Doctor', 'Admin', 'Frontdesk')
  @ApiOperation({ summary: 'Get all medical records for a patient' })
  @ApiParam({ name: 'patientId', description: 'ID of the patient' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Medical records retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getAllForPatient(
    @Param('patientId') patientId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.medicalRecordService.getAllForPatient(patientId, page, limit, type);
  }

  @Get(':id')
  @Roles('Doctor', 'Admin', 'Frontdesk')
  @ApiOperation({ summary: 'Get a single medical record by ID' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiResponse({ status: 200, description: 'Medical record retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Medical record not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async getById(@Param('id') id: string) {
    return this.medicalRecordService.getById(id);
  }

  @Put(':id')
  @Roles('Doctor', 'Admin')
  @ApiOperation({ summary: 'Update an existing medical record entry' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiBody({ type: UpdateMedicalRecordDto })
  @ApiResponse({ status: 200, description: 'Medical record updated successfully.' })
  @ApiResponse({ status: 404, description: 'Medical record not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordService.updateMedicalRecord(id, dto);
  }

  @Delete(':id')
  @Roles('Doctor', 'Admin')
  @ApiOperation({ summary: 'Delete a medical record entry' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiResponse({ status: 200, description: 'Medical record deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Medical record not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async delete(@Param('id') id: string) {
    return this.medicalRecordService.deleteMedicalRecord(id);
  }
}
