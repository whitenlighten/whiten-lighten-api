import { Controller, Post, Patch, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ClinicalNotesService } from './clinical-notes.service';
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('patients/:patientId/notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
export class ClinicalNotesController {
  constructor(private service: ClinicalNotesService) {}

  /** Doctor/Admin/Superadmin → add clinical note */
  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  addNote(@Param('patientId') patientId: string, @Req() req, @Body() dto: any) {
    return this.service.addNote(patientId, req.user.id, req.user.role, dto);
  }

  /** Doctor/Admin/Superadmin → edit note */
  @Patch(':noteId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  editNote(@Param('noteId') noteId: string, @Req() req, @Body() dto: any) {
    return this.service.editNote(noteId, req.user.id, req.user.role, dto);
  }

  /** All staff (Frontdesk = view only) → view notes */
  @Get()
  getNotes(@Param('patientId') patientId: string) {
    return this.service.getNotes(patientId);
  }

  /** Nurse → add note suggestion */
  @Post('/suggestions')
  @Roles(Role.NURSE)
  addSuggestion(@Param('patientId') patientId: string, @Req() req, @Body() dto: any) {
    return this.service.addSuggestion(patientId, req.user.id, req.user.role, dto);
  }

  /** Doctor/Admin/Superadmin → approve nurse suggestion */
  @Patch('/suggestions/:suggestionId/approve')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN)
  approveSuggestion(@Param('suggestionId') suggestionId: string, @Req() req) {
    return this.service.approveSuggestion(suggestionId, req.user.id, req.user.role);
  }
}
