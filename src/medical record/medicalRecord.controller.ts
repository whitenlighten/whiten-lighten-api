// src/medical-records/medical-record.controller.ts
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto';
import { MedicalRecordService } from './medicalRecordService';
import { MedicalRecordResponseDto } from './dto/medical-record-response.dto';

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
  @ApiOkResponse({
    description: 'Medical record created successfully.',
    type: MedicalRecordResponseDto,
  })
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
  @ApiOkResponse({
    description: 'Medical records retrieved successfully.',
    type: [MedicalRecordResponseDto],
  })
  async getAllForPatient(
    @Param('patientId') patientId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.medicalRecordService.getAllForPatient(
      patientId,
      page,
      limit,
      type,
    );
  }

  @Get(':id')
  @Roles('Doctor', 'Admin', 'Frontdesk')
  @ApiOperation({ summary: 'Get a single medical record by ID' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiOkResponse({
    description: 'Medical record retrieved successfully.',
    type: MedicalRecordResponseDto,
  })
  async getById(@Param('id') id: string) {
    return this.medicalRecordService.getById(id);
  }

  @Put(':id')
  @Roles('Doctor', 'Admin')
  @ApiOperation({ summary: 'Update an existing medical record entry' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiBody({ type: UpdateMedicalRecordDto })
  @ApiOkResponse({
    description: 'Medical record updated successfully.',
    type: MedicalRecordResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.medicalRecordService.updateMedicalRecord(id, dto);
  }

  @Delete(':id')
  @Roles('Doctor', 'Admin')
  @ApiOperation({ summary: 'Delete a medical record entry' })
  @ApiParam({ name: 'id', description: 'Medical record ID' })
  @ApiOkResponse({
    description: 'Medical record deleted successfully.',
    type: MedicalRecordResponseDto,
  })
  async delete(@Param('id') id: string) {
    return this.medicalRecordService.deleteMedicalRecord(id);
  }
}
