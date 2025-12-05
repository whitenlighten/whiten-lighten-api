/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  Query,
  // ParseUUIDPipe removed
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClinicalNotesService } from './clinical-notes.service';
import { CreateClinicalNoteDto, UpdateClinicalNoteDto, CreateNoteSuggestionDto, QueryClinicalNotesDto, PatientAutoPopulateResponseDto } from './clinical-notes.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('clinical-notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients/:patientId/notes')
export class ClinicalNotesController {
  constructor(private readonly service: ClinicalNotesService) {}

  // 1. Add clinical note (Doctor/Admin/SuperAdmin)
  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Add a clinical note for a patient (supports extended form via extendedData)' })
  @ApiResponse({ status: 201, description: 'Clinical note added successfully' })
  async addNote(
    @Param('patientId') patientId: string,
    @Body() dto: CreateClinicalNoteDto,
    @GetUser() user: any,
  ) {
    // Note: Validation of patientId is now expected in the Service layer.
    return this.service.addNote(patientId, user.userId, user.role, dto);
  }

  // 2. Edit a clinical note (partial)
  @Patch(':noteId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Edit a clinical note (partial update supported)' })
  @ApiResponse({ status: 200, description: 'Clinical note updated successfully' })
  async editNote(
    @Param('patientId') patientId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateClinicalNoteDto,
    @GetUser() user: any,
  ) {
    // Note: Validation of patientId and noteId is now expected in the Service layer.
    return this.service.editNote(patientId, noteId, user.userId, user.role, dto);
  }

  // 3. Get notes for a patient (paginated)
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)
  @ApiOperation({ summary: 'Get all clinical notes for a patient (paginated)' })
  @ApiResponse({ status: 200, description: 'Returns clinical notes' })
  async getNotes(
    @Param('patientId') patientId: string,
    @Query() query: QueryClinicalNotesDto,
  ) {
    return this.service.getNotes(patientId, query);
  }

  // 4. Get ALL notes across patients (admins & doctors)
  @Get('/all')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get ALL clinical notes across all patients (for Admin/Doctor)' })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of ALL clinical notes' })
  async findAll(
    @Query() query: QueryClinicalNotesDto,
    @GetUser() user: any,
  ) {
    return this.service.findAll(query, user);
  }

  // 5. Add suggestion (nurse)
  @Post('/suggestions')
  @Roles(Role.NURSE, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Add a clinical note suggestion' })
  @ApiResponse({ status: 201, description: 'Suggestion added successfully' })
  async addSuggestion(
    @Param('patientId') patientId: string,
    @Body() dto: CreateNoteSuggestionDto,
    @GetUser() user: any,
  ) {
    return this.service.addSuggestion(patientId, user.userId, user.role, dto);
  }

  // 6. Approve suggestion
  @Patch('/suggestions/:suggestionId/approve')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a nurse note suggestion' })
  @ApiResponse({ status: 200, description: 'Suggestion approved' })
  async approveSuggestion(
    @Param('patientId') patientId: string,
    @Param('suggestionId') suggestionId: string,
    @GetUser() user: any,
  ) {
    // Note: Validation of patientId and suggestionId is now expected in the Service layer.
    return this.service.approveSuggestion(patientId, suggestionId, user.userId, user.role);
  }

  // 7. Get patient details for auto-populate
  @Get('/patient-details')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN, Role.FRONTDESK)
  @ApiOperation({ summary: 'Get patient registration details for auto-populate (doctor forms)' })
  @ApiResponse({ status: 200, description: 'Patient details', type: PatientAutoPopulateResponseDto })
  async getPatientDetails(@Param('patientId') patientId: string) {
    // Note: Validation of patientId is now expected in the Service layer.
    return this.service.getPatientDetails(patientId);
  }
}