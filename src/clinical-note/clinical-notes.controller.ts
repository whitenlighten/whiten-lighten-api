/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/auth/decorator/roles.decorator';

@ApiTags('Clinical Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients/:patientId/notes')
export class ClinicalNotesController {
  constructor(private readonly notesService: ClinicalNotesService) {}

  // Create (Doctor/Admin/Superadmin)
  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Add a clinical note for a patient' })
  @ApiResponse({ status: 201, description: 'Note created' })
  async create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateClinicalNoteDto,
    @Req() req: any,
  ) {
    return this.notesService.addNote(patientId, dto, req.user.id);
  }

  
  // Update (Doctor/Admin/Superadmin) — not restricted to creator per your rules
  @Patch(':noteId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Update a clinical note' })
  async update(
    @Param('patientId') patientId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.notesService.update(patientId, dto, noteId);
  }
}