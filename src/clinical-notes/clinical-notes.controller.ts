import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClinicalNotesService } from './clinical-notes.service';
import { CreateClinicalNoteDto, UpdateClinicalNoteDto, CreateNoteSuggestionDto } from './clinical-notes.dto';
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

  // =====================
  // 1. Add clinical note (Doctor/Admin/SuperAdmin)
  // =====================
  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Add a clinical note for a patient' })
  @ApiResponse({ status: 201, description: 'Clinical note added successfully' })
  async addNote(
    @Param('patientId') patientId: string,
    @Body() dto: CreateClinicalNoteDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role
  ) {
    return this.service.addNote(patientId, userId, userRole, dto);
  }

  // =====================
  // 2. Edit a clinical note
  // =====================
  @Patch(':noteId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Edit a clinical note' })
  @ApiResponse({ status: 200, description: 'Clinical note updated successfully' })
  async editNote(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateClinicalNoteDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role
  ) {
    return this.service.editNote(noteId, userId, userRole, dto);
  }

  // =====================
  // 3. Get all notes for a patient (all staff)
  // =====================
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)
  @ApiOperation({ summary: 'Get all clinical notes for a patient' })
  @ApiResponse({ status: 200, description: 'Returns clinical notes' })
  async getNotes(@Param('patientId') patientId: string) {
    return this.service.getNotes(patientId);
  }

  // =====================
  // 4. Add note suggestion (Nurse)
  // =====================
  @Post('/suggestions')
  @Roles(Role.NURSE)
  @ApiOperation({ summary: 'Add a clinical note suggestion' })
  @ApiResponse({ status: 201, description: 'Suggestion added successfully' })
  async addSuggestion(
    @Param('patientId') patientId: string,
    @Body() dto: CreateNoteSuggestionDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role
  ) {
    return this.service.addSuggestion(patientId, userId, userRole, dto);
  }

  // =====================
  // 5. Approve suggestion (Doctor/Admin/SuperAdmin)
  // =====================
  @Patch('/suggestions/:suggestionId/approve')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a nurse note suggestion' })
  @ApiResponse({ status: 200, description: 'Suggestion approved' })
  async approveSuggestion(
    @Param('suggestionId') suggestionId: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: Role
  ) {
    return this.service.approveSuggestion(suggestionId, userId, userRole);
  }
}
