/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto';
import { ok } from 'src/common/helpers/api.response';

@Injectable()
export class ClinicalNotesService {
  addNote(patientId: string, dto: CreateClinicalNoteDto, id: any) {
    throw new Error('Method not implemented.');
  }
  updateNote(patientId: string, noteId: string, dto: UpdateClinicalNoteDto) {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly prisma: PrismaService) {}

  async create(patientId: string, dto: CreateClinicalNoteDto, userId: string) {
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new NotFoundException('Patient not found');

      const note = await this.prisma.clinicalNote.create({
        data: {
          note: dto.note,
          patientId,
          createdById: userId,
        },
      });

      return ok('Clinical note added successfully', note);
    } catch (error) {
      console.error('create clinical note error:', error);
      throw new InternalServerErrorException('Error creating clinical note');
    }
  }

  async getPatientNotes(patientId: string) {
    const notes = await this.prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return ok('Clinical notes retrieved successfully', notes);
  }

  async update(noteId: string, dto: UpdateClinicalNoteDto, userId: string) {
    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    if (note.createdById !== userId) {
      throw new ForbiddenException('You can only update your own notes');
    }

    const updated = await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: { note: dto.note },
    });

    return ok('Clinical note updated successfully', updated);
  }
}
