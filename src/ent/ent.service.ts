// src/modules/ent/ent.service.ts
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateEntNoteDto, CreateEntSymptomDto, UpdateEntNoteDto, UpdateEntSymptomDto } from './ent.dto';

@Injectable()
export class EntService {
    private readonly logger = new Logger(EntService.name);
  constructor(private prisma: PrismaService) {}

  // Create a clinical note for a patient by a doctor (or admin)
  async createNote(patientId: string, doctorId: string, dto: CreateEntNoteDto) {
    console.log('createEntNote called with:', { dto, patientId, doctorId });
    // patient validation
    try {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) throw new NotFoundException('Patient not found'); 

      const note = await this.prisma.entNote.create({
        data: {
          patientId,
          doctorId,
          title: dto.title,
          content: dto.content,
        },
      });
      console.log('Chart created successfully:', note);
      return note;
    } catch (err: any) {
      this.logger.error(`Failed to create note for patient ${patientId}`, err.stack);
      // Re-throw specific client errors
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to create note');
    }
  }

  // Read (list) notes for a patient, paginated
  async listNotes(patientId: string, page = 1, limit = 20) {
     try {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) throw new NotFoundException('Patient not found'); 

    const skip = (page - 1) * limit;


    const [total, data] = await this.prisma.$transaction([
      this.prisma.entNote.count({ where: { patientId, deletedAt: null } }),
      this.prisma.entNote.findMany({
        where: { patientId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { doctor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
    ]);
    console.log('getEntNote results:', { total, count: data.length});
    return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err: any) {
      this.logger.error(`Failed to list notes for patient ${patientId}`, err.stack);
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to fetch ENT notes');
    }
  }

  // Get single note
  async getNote(id: string) {
   try {
      const note = await this.prisma.entNote.findFirst({
        where: { id, deletedAt: null },
      });
      if (!note) {
        throw new NotFoundException('Note not found');
      }
      return note;
    } catch (err: any) {
      this.logger.error(`Failed to fetch note with id ${id}`, err.stack);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch Note');
    }
}

  // Update note
  async updateNote(id: string, userId: string, dto: UpdateEntNoteDto) {
    try {
      const note = await this.prisma.entNote.findFirst({
        where: { id, deletedAt: null },
      });
      console.log('Note lookup result:', note);

      if (!note) {
        throw new NotFoundException('Note not found');
      }
      const updated = await this.prisma.entNote.update({
        where: { id },
        data: {
          title: dto.title,
          content: dto.content,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
      console.log('Note updated successfully:', updated);
      return updated;
    } catch (err: any) {
      this.logger.error(`Failed to update note ${id}`, err.stack);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Failed to update note');
    }
  }

  // Soft-delete
  async deleteNote(id: string, userId: string,) {
    try {
      const note = await this.prisma.entNote.findFirst({
        where: { id, deletedAt: null },
      });
      if (!note) throw new NotFoundException('Note not found');
      console.log('Note lookup result:', note);
    return this.prisma.entNote.update({
            where: { id },
        data: {
                deletedAt: new Date(),
                deletedBy: userId,
            },
    }); } catch (err: any) {
      this.logger.error(`Failed to delete note ${id}`, err.stack);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) {
            throw err;
        }
      throw new InternalServerErrorException('Failed to delete note');
    }
  }

  // ------------------ Symptoms ------------------

  async createSymptom(patientId: string, doctorId: string, dto: CreateEntSymptomDto) {
    try {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient) throw new NotFoundException('Patient not found');
        console.log('Patient lookup result:', patient);  

     const symptom = await this.prisma.entSymptom.create({
        data: {
          patientId,
          doctorId,
          symptom: dto.symptom,
          severity: dto.severity,
          note: dto.note,
        },
      });
      return symptom;
    } catch (err: any) {
        if (err instanceof NotFoundException) {throw err; }
      this.logger.error(`Failed to create symptom for patient ${patientId}`, err.stack);
      throw new InternalServerErrorException('Failed to create symptom');
    }
  }

  async listSymptoms(patientId: string, page = 1, limit = 20) {
      try {
        const skip = (page - 1) * limit;

        const [total, data] = await this.prisma.$transaction([
            this.prisma.entSymptom.count({ where: { patientId, deletedAt: null } }),
            this.prisma.entSymptom.findMany({
                where: { patientId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { doctor: { select: { id: true, firstName: true, lastName: true, email: true } } },
            }),
        ]);

        return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
        } catch (err: any) {
            this.logger.error(`Failed to list symptoms for patient ${patientId}`, err.stack);
            throw new InternalServerErrorException('Failed to fetch patient symptoms');
        }
    }

    async getSymptom(id: string) {
    console.log('getSymptom called with:', id);
    try {
        const symptom = await this.prisma.entSymptom.findUnique({
            where: { id },
            // Include related doctor information, similar to how you included the patient in getChartById
            include: { doctor: { select: { id: true, firstName: true, lastName: true, email: true } } }, 
        });
        
        console.log('getSymptom result:', symptom);

        // Check if the symptom exists AND has not been soft-deleted
        if (!symptom || symptom.deletedAt) {
            throw new NotFoundException('Symptom record not found');
        }
        
        return symptom;
    } catch (err: any) {
        this.logger.error(`Failed to get symptom ${id}`, err.stack);
        
        // Re-throw the NotFoundException if it was thrown above
        if (err instanceof NotFoundException) {
            throw err;
        }
        
        // Throw a generic 500 Internal Server Error for database issues, etc.
        throw new InternalServerErrorException('Failed to fetch symptom record');
    }
}



// taking the id of the note
  async updateSymptom(id: string, userId: string, dto: UpdateEntSymptomDto) {
    try {
      const symptom = await this.prisma.entSymptom.findFirst({
        where: { id, deletedAt: null },
      });
      console.log('Symptom lookup result:', symptom);

      if (!symptom) {
        throw new NotFoundException('Symptom not found');
      }

      const updated = await this.prisma.entSymptom.update({
        where: { id },
        data: {
          symptom: dto.symptom ?? symptom.symptom,
          severity: dto.severity ?? symptom.severity,
          note: dto.note ?? symptom.note,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
      return updated;
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) { throw err; }
      this.logger.error(`Failed to update symptom ${id}`, err.stack);
      throw new InternalServerErrorException('Failed to update symptom');
    }
  }

  async deleteSymptom(id: string, userId: string, role: Role) {
    try {
        const symptom = await this.prisma.entSymptom.findFirst({
          where: { id, deletedAt: null },
        });
        console.log('Symptom lookup result:', symptom);

        if (!symptom || symptom.deletedAt) {
            throw new NotFoundException('Symptom not found');
        }

        // 4. Perform the soft-delete
        return this.prisma.entSymptom.update({ 
            where: { id }, 
            data: {
                deletedAt: new Date(),
                deletedBy: userId,
            }, 
        });
    } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) {
            throw err;
        }
        this.logger.error(`Failed to delete symptom ${id}`, err.stack);
        throw new InternalServerErrorException('Failed to delete symptom');
    }
  }
}
