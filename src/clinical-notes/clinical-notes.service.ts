import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';

@Injectable()
export class ClinicalNotesService {
  constructor(
    private prisma: PrismaService,
    private mailer: MailService,
  ) {}

  /** Doctor/Admin/Superadmin creates a clinical note */
  async addNote(
    patientId: string,
    userId: string,
    role: Role,
    dto: { observations?: string; doctorNotes?: string; treatmentPlan?: string },
  ) {
    if (!["DOCTOR", "ADMIN", "SUPERADMIN"].includes(role)) {
      throw new ForbiddenException('Only doctors or admins can add clinical notes');
    }

    return this.prisma.clinicalNote.create({
      data: {
        patientId,
        createdById: userId,
        observations: dto.observations,
        doctorNotes: dto.doctorNotes,
        treatmentPlan: dto.treatmentPlan,
        status: 'APPROVED', // direct approval since doctor/admin creates
      },
    });
  }

  /** Doctor/Admin/Superadmin edits a clinical note */
  async editNote(
    noteId: string,
    userId: string,
    role: Role,
    dto: { observations?: string; doctorNotes?: string; treatmentPlan?: string },
  ) {
    if (!["DOCTOR", "ADMIN", "SUPERADMIN"].includes(role)) {
      throw new ForbiddenException('Only doctors or admins can edit clinical notes');
    }

    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        observations: dto.observations ?? note.observations,
        doctorNotes: dto.doctorNotes ?? note.doctorNotes,
        treatmentPlan: dto.treatmentPlan ?? note.treatmentPlan,
        updatedAt: new Date(),
      },
    });
  }

  /** All staff (frontdesk read-only) view notes */
  async getNotes(patientId: string) {
    return this.prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Nurse adds note suggestion */
  async addSuggestion(patientId: string, userId: string, role: Role, dto: { content: string }) {
    if (role !== Role.NURSE) {
      throw new ForbiddenException('Only nurses can add note suggestions');
    }

    const suggestion = await this.prisma.noteSuggestion.create({
      data: {
        patientId,
        createdById: userId,
        content: dto.content,
        status: 'PENDING',
      },
    });

    // Notify doctors/admins about the new suggestion
      await this.mailer.sendMail(
        'doctor@hospital.com', // can be dynamic
        'New Clinical Note Suggestion',
        `A nurse has submitted a new note suggestion for patient ${patientId}. Please review.`,
      );
    return suggestion;
  }

  /** Doctor approves nurse suggestion */
  async approveSuggestion(suggestionId: string, userId: string, role: Role) {
    if (!["DOCTOR", "ADMIN", "SUPERADMIN"].includes(role)) {
      throw new ForbiddenException('Only doctors or admins can approve suggestions');
    }

    const suggestion = await this.prisma.noteSuggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');

    // Approve the suggestion
    const approved = await this.prisma.noteSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'APPROVED', approvedById: userId },
    });

    // Create a formal Clinical Note from the approved suggestion
    await this.prisma.clinicalNote.create({
      data: {
        patientId: suggestion.patientId,
        createdById: userId,
        observations: suggestion.content,
        status: 'APPROVED',
      },
    });

    // Notify nurse about approval
    await this.mailer.sendMail(
      'nurse@hospital.com', // dynamic from suggestion.createdBy.email
      'Clinical Note Suggestion Approved',
      `Your note suggestion for patient ${suggestion.patientId} has been approved.`,
    );

    return approved;
  }
}
