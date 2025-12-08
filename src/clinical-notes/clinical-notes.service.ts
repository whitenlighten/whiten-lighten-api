/* eslint-disable prettier/prettier */
import {
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  Injectable,
} from '@nestjs/common';
// FIX 1: Import Prisma type definitions for update input and JsonNull
import { Role, Prisma } from '@prisma/client'; 
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';
import { CreateClinicalNoteDto, QueryClinicalNotesDto, UpdateClinicalNoteDto } from './clinical-notes.dto';

// --- Utility for data mapping ---
// Note: 'extra' is kept here as it's used in the code to handle legacy/separate JSON input
const TOP_LEVEL_FIELDS = ['observations', 'doctorNotes', 'treatmentPlan', 'extra'];

@Injectable()
export class ClinicalNotesService {
  private readonly logger = new Logger(ClinicalNotesService.name);

  constructor(
    private prisma: PrismaService,
    private mailer: MailService,
  ) {}

  // ----------------------------------------------------------------------
  // 1. GET PATIENT DETAILS (Utility for UI)
  // ----------------------------------------------------------------------
  async getPatientDetails(patientId: string) {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          patientId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          address: true,
          registrationType: true,
        },
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      return {
        ...patient,
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : undefined,
      };
    } catch (err: any) {
      this.logger.error(`Failed to retrieve patient details for ID ${patientId}`, err.stack);
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to retrieve patient details');
    }
  }

  // ----------------------------------------------------------------------
  // 2. ADD NOTE (CREATE)
  // ----------------------------------------------------------------------
  async addNote(
    patientId: string,
    userId: string,
    role: Role,
    dto: CreateClinicalNoteDto,
  ) {
    const op = `ADD_NOTE for patient ${patientId} by ${userId}`;
    this.logger.log(`Starting ${op}`);
    try {
      // 1. Authorization
      const allowed = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
      if (!allowed.has(role)) {
        throw new ForbiddenException('Only doctors or admins can add clinical notes');
      }

      // 2. ensure patient exists
      const patientExists = await this.prisma.patient.findUnique({ where: { id: patientId } });
      if (!patientExists) throw new NotFoundException('Patient not found');

      // 3. split legacy top-level fields and extended fields
      const { observations, doctorNotes, treatmentPlan, extra, ...extendedFields } = dto;

      const extendedData: Record<string, any> = {};
      Object.entries(extendedFields).forEach(([k, v]) => {
        if (v !== undefined) extendedData[k] = v;
      });
      if (extra && typeof extra === 'object') {
        Object.assign(extendedData, extra);
      }

      // 4. create note
      const note = await this.prisma.clinicalNote.create({
        data: {
          patientId: patientId,
          createdById: userId,
          observations: observations ?? null,
          doctorNotes: doctorNotes ?? null,
          treatmentPlan: treatmentPlan ?? null,
          status: 'APPROVED', 
          // FIX 2: Use Prisma.JsonNull for null value assignment
          extendedData: Object.keys(extendedData).length ? extendedData : Prisma.JsonNull,
        },
      });

      // 5. Audit Log (Following UsersService Pattern)
      this.prisma.auditLog
        .create({
          data: {
            userId: userId,
            action: 'CREATE_CLINICAL_NOTE',
            resource: 'ClinicalNote',
            resourceId: note.id,
            changes: { patientId, createdByRole: role },
          },
        })
        .catch((e) => this.logger.warn(`Audit log failed for ${op}: ${e.message}`));
      
      this.logger.log(`Completed ${op}. Note ID: ${note.id}`);
      return note;
    } catch (err: any) {
      this.logger.error(`❌ ${op} failed: ${err.message}`, err.stack);
      if (err instanceof ForbiddenException || err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create clinical note');
    }
  }

  // ----------------------------------------------------------------------
  // 3. EDIT NOTE (UPDATE)
  // ----------------------------------------------------------------------
  async editNote(
    patientId: string,
    noteId: string,
    userId: string,
    role: Role,
    dto: UpdateClinicalNoteDto,
  ) {
    const op = `EDIT_NOTE ${noteId} for patient ${patientId} by ${userId}`;
    this.logger.log(`Starting ${op}`);

    try {
      // 1. Authorization
      const allowed = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
      if (!allowed.has(role)) {
        throw new ForbiddenException('Only doctors or admins can edit clinical notes');
      }

      // 2. Fetch and validate note
      const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
      if (!note) throw new NotFoundException('Note not found');
      if (note.patientId !== patientId) throw new ForbiddenException('This note does not belong to the specified patient.');
      
      // const oldData = { ...note }; // Original: Capture pre-update state for audit (kept for context)

      // 3. Prepare updates - START OF CLEANED UP BLOCK
      // REMOVED: const updates: any = {};
      // REMOVED: const { extra, ...rest } = dto;
      
      // Separating fields from DTO
      const { observations, doctorNotes, treatmentPlan, extra, ...extendedFields } = dto;
 
      // FIX 3: Single declaration of updates with correct Prisma type
      const updates: Prisma.ClinicalNoteUpdateInput = {};
 
      // Assign standard fields if provided
      if (observations !== undefined) updates.observations = observations;
      if (doctorNotes !== undefined) updates.doctorNotes = doctorNotes;
      if (treatmentPlan !== undefined) updates.treatmentPlan = treatmentPlan;
 
      // Merge extended data
      const existingExtended = (note.extendedData as Record<string, any>) ?? {};
      const providedExtended = { ...extendedFields };
      if (extra && typeof extra === 'object') {
        Object.assign(providedExtended, extra);
      }
 
      const mergedExtended = { ...existingExtended, ...providedExtended };
 
      // Only update extendedData if there are fields provided in the DTO
      if (Object.keys(providedExtended).length > 0) {
        // FIX 4: Use Prisma.JsonNull for empty object to satisfy Prisma's JSON type
        updates.extendedData = Object.keys(mergedExtended).length ? mergedExtended : Prisma.JsonNull;
      }
      // The rest of the duplicated logic blocks below this point were entirely removed.

      updates.updatedAt = new Date(); 

      // 4. Perform update
      const updated = await this.prisma.clinicalNote.update({
        where: { id: noteId },
        data: updates,
      });
      
      // 5. Audit Log (Following UsersService Pattern)
      this.prisma.auditLog
        .create({
          data: {
            userId: userId,
            action: 'UPDATE_CLINICAL_NOTE',
            resource: 'ClinicalNote',
            resourceId: noteId,
            changes: dto as any, // Log the DTO changes
          },
        })
        .catch((e) => this.logger.warn(`Audit log failed for ${op}: ${e.message}`));

      this.logger.log(`Completed ${op}.`);
      return updated;
    } catch (err: any) {
      this.logger.error(`❌ ${op} failed: ${err.message}`, err.stack);
      if (err.code === 'P2025') throw new NotFoundException('Note not found');
      if (err instanceof ForbiddenException || err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to edit clinical note');
    }
  }

  // ----------------------------------------------------------------------
  // 4. GET NOTES (FIND ALL BY PATIENT)
  // ----------------------------------------------------------------------
  async getNotes(patientId: string, query: QueryClinicalNotesDto) {
    try {
      const page = parseInt(query.page || '1', 10);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      // Optional: Check if patient exists first for clearer error message, 
      // but current pattern is acceptable as an empty list is returned otherwise.

      const [total, data] = await this.prisma.$transaction([
        this.prisma.clinicalNote.count({ where: { patientId } }),
        this.prisma.clinicalNote.findMany({
          where: { patientId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (err: any) {
      this.logger.error(`❌ GET_NOTES failed for patient ${patientId}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to retrieve clinical notes');
    }
  }

  // ----------------------------------------------------------------------
  // 5. FIND ALL (GLOBAL)
  // ----------------------------------------------------------------------
  async findAll(query: QueryClinicalNotesDto, user: { role: Role }) {
    const op = 'FIND_ALL_NOTES';
    try {
      const allowed = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
      if (!allowed.has(user.role)) throw new ForbiddenException('Insufficient permissions to list all clinical notes');

      const page = parseInt(query.page || '1', 10);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.q) {
        where.OR = [
          { observations: { contains: query.q, mode: 'insensitive' } },
          { doctorNotes: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      const [total, data] = await this.prisma.$transaction([
        this.prisma.clinicalNote.count({ where }),
        this.prisma.clinicalNote.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (err: any) {
      this.logger.error(`❌ ${op} failed: ${err.message}`, err.stack);
      if (err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Failed to list clinical notes');
    }
  }

  // ----------------------------------------------------------------------
  // 6. ADD SUGGESTION
  // ----------------------------------------------------------------------
  async addSuggestion(patientId: string, userId: string, role: Role, dto: { content: string }) {
    const op = `ADD_SUGGESTION for patient ${patientId} by ${userId}`;
    try {
      const allowed = new Set<Role>([Role.NURSE, Role.ADMIN, Role.SUPERADMIN]);
      if (!allowed.has(role)) throw new ForbiddenException('Only nurses, admins, or superadmins can add note suggestions');

      const suggestion = await this.prisma.noteSuggestion.create({
        data: {
          patientId,
          createdById: userId,
          content: dto.content,
          status: 'PENDING',
        },
      });

      // Audit Log (Following UsersService Pattern)
      this.prisma.auditLog
        .create({
          data: {
            userId: userId,
            action: 'CREATE_SUGGESTION',
            resource: 'NoteSuggestion',
            resourceId: suggestion.id,
            changes: { patientId, createdByRole: role },
          },
        })
        .catch((e) => this.logger.warn(`Audit log failed for ${op}: ${e.message}`));

      // send mail notification (best-effort, catch error to prevent main failure)
      this.mailer.sendMail(
        'doctor@hospital.com',
        'New Clinical Note Suggestion',
        `A nurse has submitted a new note suggestion for patient ${patientId}. Please review.`,
      ).catch(err => this.logger.warn(`Suggestion email failed for ${op}`, err?.stack || err));

      return suggestion;
    } catch (err: any) {
      this.logger.error(`❌ ${op} failed: ${err.message}`, err.stack);
      if (err instanceof ForbiddenException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to add suggestion');
    }
  }

  // ----------------------------------------------------------------------
  // 7. APPROVE SUGGESTION
  // ----------------------------------------------------------------------
  async approveSuggestion(patientId: string, suggestionId: string, userId: string, role: Role) {
    const op = `APPROVE_SUGGESTION ${suggestionId} by ${userId}`;
    try {
      // 1. Authorization
      const allowed = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
      if (!allowed.has(role)) throw new ForbiddenException('Only doctors or admins can approve suggestions');

      // 2. Validation
      const suggestion = await this.prisma.noteSuggestion.findUnique({ where: { id: suggestionId } });
      if (!suggestion) throw new NotFoundException('Suggestion not found');
      if (suggestion.patientId !== patientId) throw new ForbiddenException('Suggestion does not belong to this patient');

      // 3. Transaction: Update suggestion status and create new clinical note
      const [approved, newNote] = await this.prisma.$transaction([
        this.prisma.noteSuggestion.update({
          where: { id: suggestionId },
          data: { status: 'APPROVED', approvedById: userId },
        }),
        this.prisma.clinicalNote.create({
          data: {
            patientId: suggestion.patientId,
            createdById: userId, // Doctor/Admin is the final creator of the clinical note
            observations: suggestion.content,
            status: 'APPROVED',
          },
        }),
      ]);
      
      // 4. Audit Log (Following UsersService Pattern)
      this.prisma.auditLog
        .create({
          data: {
            userId: userId,
            action: 'APPROVE_SUGGESTION',
            resource: 'NoteSuggestion',
            resourceId: suggestionId,
            changes: { clinicalNoteId: newNote.id, approverRole: role },
          },
        })
        .catch((e) => this.logger.warn(`Audit log failed for ${op}: ${e.message}`));

      // best-effort notify nurse
      this.mailer.sendMail('nurse@hospital.com', 'Clinical Note Suggestion Approved', `Your suggestion for ${suggestion.patientId} was approved.`)
        .catch(err => this.logger.warn(`Approval email failed for ${op}`, err?.stack || err));

      return approved;
    } catch (err: any) {
      this.logger.error(`❌ ${op} failed: ${err.message}`, err.stack);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Failed to approve suggestion');
    }
  }
}