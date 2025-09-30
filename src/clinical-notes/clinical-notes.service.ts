import {  ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';
import { QueryClinicalNotesDto } from './clinical-notes.dto';
import { Injectable } from '@nestjs/common';

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
    const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
    if (!allowedRoles.has(role)) {
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
    patientId: string,
    noteId: string,
    userId: string,
    role: Role,
    dto: { observations?: string; doctorNotes?: string; treatmentPlan?: string },
  ) {
    const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
    if (!allowedRoles.has(role)) {
      throw new ForbiddenException('Only doctors or admins can edit clinical notes');
    }

    const note = await this.prisma.clinicalNote.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException('Note not found');
    if (note.patientId !== patientId) {
      throw new ForbiddenException('This note does not belong to the specified patient.');
    }

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

  /**
   * ===========================================
   * GET all clinical notes (paginated, filtered)
   * ===========================================
   */
  async findAll(query: QueryClinicalNotesDto, user: { role: Role }) {
    // 1. Authorization
    const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
    if (!allowedRoles.has(user.role)) {
      throw new ForbiddenException('You do not have permission to view all clinical notes.');
    }

    // 2. Pagination
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // 3. Filtering
    const where: any = { status: 'APPROVED' }; // Base filter
    if (query.q) {
      where.OR = [
        { observations: { contains: query.q, mode: 'insensitive' } },
        { doctorNotes: { contains: query.q, mode: 'insensitive' } },
        { treatmentPlan: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // 4. Database query using a transaction for consistency
    const [total, data] = await this.prisma.$transaction([
      this.prisma.clinicalNote.count({ where }),
      this.prisma.clinicalNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // You can add field selection here if needed, similar to patients.service
      }),
    ]);

    // 5. Return paginated response
    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  /** Nurse adds note suggestion */
  async addSuggestion(patientId: string, userId: string, role: Role, dto: { content: string }) {
    const allowedRoles = new Set<Role>([Role.NURSE, Role.ADMIN, Role.SUPERADMIN]);
    if (!allowedRoles.has(role)) {
      throw new ForbiddenException('Only nurses, admins, or superadmins can add note suggestions');
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
  async approveSuggestion(patientId: string, suggestionId: string, userId: string, role: Role) {
    const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
    if (!allowedRoles.has(role)) {
      throw new ForbiddenException('Only doctors or admins can approve suggestions');
    }

    const suggestion = await this.prisma.noteSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    if (suggestion.patientId !== patientId) {
      throw new ForbiddenException('This suggestion does not belong to the specified patient.');
    }

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
