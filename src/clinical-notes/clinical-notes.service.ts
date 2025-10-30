// src/modules/clinical-notes/clinical-notes.service.ts
import { 
    ForbiddenException, 
    NotFoundException, 
    InternalServerErrorException, // ⬅️ Added for generic errors
    BadRequestException,          // ⬅️ Added for potential validation errors
    Logger,                       // ⬅️ Added for logging
    Injectable 
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';
import { QueryClinicalNotesDto } from './clinical-notes.dto';

@Injectable()
export class ClinicalNotesService {
    private readonly logger = new Logger(ClinicalNotesService.name); // ⬅️ Logger instance

    constructor(
        private prisma: PrismaService,
        private mailer: MailService,
    ) {}

    // ----------------------------------------------------------------------
    // 1. ADD NOTE (Doctor/Admin creates)
    // ----------------------------------------------------------------------
    async addNote(
        patientId: string,
        userId: string,
        role: Role,
        dto: { observations?: string; doctorNotes?: string; treatmentPlan?: string },
    ) {
        try {
            // 1. Authorization
            const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
            if (!allowedRoles.has(role)) {
                throw new ForbiddenException('Only doctors or admins can add clinical notes');
            }
            
            // NOTE: Consider validating patientId existence here if not done in the controller
            const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
            if (!patient) {
                throw new NotFoundException('Patient not found');
            }


            // 2. Core Logic
            return await this.prisma.clinicalNote.create({
                data: {
                    patient: {
                        connect: { id: patientId },
                    },
                    createdBy: { connect: { id: userId } },
                    observations: dto.observations,
                    doctorNotes: dto.doctorNotes,
                    treatmentPlan: dto.treatmentPlan,
                    status: 'APPROVED',
                },
            });
        } catch (err: any) {
            this.logger.error(`Failed to add clinical note for patient ${patientId} by user ${userId}.`, err.stack);
            
            if (err instanceof ForbiddenException || err instanceof NotFoundException || err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Failed to create clinical note');
        }
    }

    // ----------------------------------------------------------------------
    // 2. EDIT NOTE (Doctor/Admin edits)
    // ----------------------------------------------------------------------
    async editNote(
        patientId: string,
        noteId: string,
        userId: string,
        role: Role,
        dto: { observations?: string; doctorNotes?: string; treatmentPlan?: string },
    ) {
        try {
            // 1. Authorization
            const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
            if (!allowedRoles.has(role)) {
                throw new ForbiddenException('Only doctors or admins can edit clinical notes');
            }

            // 2. Existence and Context Check
            const note = await this.prisma.clinicalNote.findUnique({
                where: { id: noteId },
            });
            if (!note) {
                throw new NotFoundException('Note not found');
            }
            if (note.patientId !== patientId) {
                throw new ForbiddenException('This note does not belong to the specified patient.');
            }
            
            // NOTE: Add check if the current user created the note (unless Admin/Superadmin)
            // if (role === Role.DOCTOR && note.createdById !== userId) { ... }

            // 3. Core Logic
            return await this.prisma.clinicalNote.update({
                where: { id: noteId },
                data: {
                    observations: dto.observations ?? note.observations,
                    doctorNotes: dto.doctorNotes ?? note.doctorNotes,
                    treatmentPlan: dto.treatmentPlan ?? note.treatmentPlan,
                    updatedAt: new Date(),
                },
            });
        } catch (err: any) {
            this.logger.error(`Failed to edit note ${noteId} for patient ${patientId} by user ${userId}.`, err.stack);
            
            if (err instanceof ForbiddenException || err instanceof NotFoundException || err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Failed to edit clinical note');
        }
    }

    // ----------------------------------------------------------------------
    // 3. GET NOTES (for a specific patient)
    // ----------------------------------------------------------------------
    async getNotes(patientId: string, query: QueryClinicalNotesDto) {
        try {
            // NOTE: Authorization should be done in the controller before calling this (Staff/Admin)
            
            // 1. Pagination
            const page = parseInt(query.page || '1', 10);
            const limit = Math.min(parseInt(query.limit || '20', 10), 100);
            const skip = (page - 1) * limit;

            // 2. Database query
            const [total, data] = await this.prisma.$transaction([
                this.prisma.clinicalNote.count({ where: { patientId } }),
                this.prisma.clinicalNote.findMany({
                where: { patientId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                }),
            ]);

            // 3. Return paginated response
            return {
                meta: { total, page, limit, pages: Math.ceil(total / limit) },
                data,
            };
        } catch (err: any) {
            this.logger.error(`Failed to retrieve clinical notes for patient ${patientId}.`, err.stack);
            
            // Assuming the patientId exists, any error here is internal
            throw new InternalServerErrorException('Failed to retrieve patient clinical notes');
        }
    }

    // ----------------------------------------------------------------------
    // 4. FIND ALL (paginated, filtered list)
    // ----------------------------------------------------------------------
    async findAll(query: QueryClinicalNotesDto, user: { role: Role }) {
        try {
            // 1. Authorization (Preserved)
            const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
            if (!allowedRoles.has(user.role)) {
                throw new ForbiddenException('You do not have permission to view all clinical notes.');
            }

            // 2. Pagination
            const page = parseInt(query.page || '1', 10);
            const limit = Math.min(parseInt(query.limit || '20', 10), 100);
            const skip = (page - 1) * limit;

            // 3. Filtering
            const where: any = { status: 'APPROVED' };
            if (query.q) {
                where.OR = [
                    { observations: { contains: query.q, mode: 'insensitive' } },
                    { doctorNotes: { contains: query.q, mode: 'insensitive' } },
                    { treatmentPlan: { contains: query.q, mode: 'insensitive' } },
                ];
            }

            // 4. Database query
            const [total, data] = await this.prisma.$transaction([
                this.prisma.clinicalNote.count({ where }),
                this.prisma.clinicalNote.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            
            // 5. Return paginated response
            return {
                meta: { total, page, limit, pages: Math.ceil(total / limit) },
                data,
            };
        } catch (err: any) {
            this.logger.error(`Failed to list all clinical notes. Query: ${JSON.stringify(query)}`, err.stack);
            
            if (err instanceof ForbiddenException || err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Failed to retrieve clinical notes list');
        }
    }

    // ----------------------------------------------------------------------
    // 5. ADD SUGGESTION (Nurse adds)
    // ----------------------------------------------------------------------
    async addSuggestion(patientId: string, userId: string, role: Role, dto: { content: string }) {
        try {
            // 1. Authorization
            const allowedRoles = new Set<Role>([Role.NURSE, Role.ADMIN, Role.SUPERADMIN]);
            if (!allowedRoles.has(role)) {
                throw new ForbiddenException('Only nurses, admins, or superadmins can add note suggestions');
            }
            
            // 2. Core Logic
            const suggestion = await this.prisma.noteSuggestion.create({
                data: {
                    patientId,
                    createdById: userId,
                    content: dto.content,
                    status: 'PENDING',
                },
            });

            // 3. External Call (Mail)
            await this.mailer.sendMail(
                'doctor@hospital.com',
                'New Clinical Note Suggestion',
                `A nurse has submitted a new note suggestion for patient ${patientId}. Please review.`,
            );
            
            return suggestion;
        } catch (err: any) {
            this.logger.error(`Failed to add suggestion for patient ${patientId} by user ${userId}.`, err.stack);
            
            // Assuming mailer errors are audited/logged but don't fail the primary transaction
            if (err instanceof ForbiddenException || err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Failed to add clinical note suggestion');
        }
    }

    // ----------------------------------------------------------------------
    // 6. APPROVE SUGGESTION (Doctor approves)
    // ----------------------------------------------------------------------
    async approveSuggestion(patientId: string, suggestionId: string, userId: string, role: Role) {
        try {
            // 1. Authorization
            const allowedRoles = new Set<Role>([Role.DOCTOR, Role.ADMIN, Role.SUPERADMIN]);
            if (!allowedRoles.has(role)) {
                throw new ForbiddenException('Only doctors or admins can approve suggestions');
            }

            // 2. Existence and Context Check
            const suggestion = await this.prisma.noteSuggestion.findUnique({
                where: { id: suggestionId },
            });
            if (!suggestion) {
                throw new NotFoundException('Suggestion not found');
            }
            if (suggestion.patientId !== patientId) {
                throw new ForbiddenException('This suggestion does not belong to the specified patient.');
            }
            
            // 3. Database Updates (wrapped in a transaction for atomicity - suggested enhancement)
            const [approved, newNote] = await this.prisma.$transaction([
                // Approve the suggestion
                this.prisma.noteSuggestion.update({
                    where: { id: suggestionId },
                    data: { status: 'APPROVED', approvedById: userId },
                }),
                // Create a formal Clinical Note
                this.prisma.clinicalNote.create({
                    data: {
                        patientId: suggestion.patientId,
                        createdById: userId, // Doctor/Admin is the one creating the official note
                        observations: suggestion.content,
                        status: 'APPROVED',
                    },
                }),
            ]);

            // 4. External Call (Mail)
            await this.mailer.sendMail(
                'nurse@hospital.com', // In a real app, you'd fetch the creator's email
                'Clinical Note Suggestion Approved',
                `Your note suggestion for patient ${suggestion.patientId} has been approved.`,
            );

            return approved;
        } catch (err: any) {
            this.logger.error(`Failed to approve suggestion ${suggestionId} for patient ${patientId} by user ${userId}.`, err.stack);
            
            if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
                throw err;
            }
            throw new InternalServerErrorException('Failed to approve suggestion');
        }
    }
}