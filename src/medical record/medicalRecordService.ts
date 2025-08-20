import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ok } from 'src/common/helpers/api.response';
import { AllergySeverity, CreateMedicalRecordDto, RecordType, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

const medicalRecordSelect = {
  id: true,
  patientId: true,
  type: true,
  name: true,
  notes: true,
  diagnosedAt: true,
  resolvedAt: true,
  severity: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class MedicalRecordService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new medical record for a patient
   * Only accessible to Doctor, Admin, Frontdesk
   */
  @UseGuards(RolesGuard)
  @Roles('Doctor', 'Admin', 'Frontdesk')
  async createMedicalRecord(dto: CreateMedicalRecordDto) {
    try {
      // Verify patient exists and is not soft-deleted
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true, deletedAt: true },
      });

      if (!patient || patient.deletedAt) {
        throw new NotFoundException('Patient not found');
      }

      // Create the medical record
      const entry = await this.prisma.medicalRecord.create({
        data: {
          patientId: dto.patientId,
          type: dto.type as RecordType,
          name: dto.name,
          notes: dto.notes,
          diagnosedAt: dto.diagnosedAt,
          resolvedAt: dto.resolvedAt,
          severity: dto.severity as AllergySeverity,
        },
        select: medicalRecordSelect,
      });

      return ok('Medical record entry created', entry);
    } catch (error) {
      console.error('createMedicalRecord error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error creating medical record entry');
    }
  }

  /**
   * Get all medical records for a patient with pagination
   */
  async getAllForPatient(patientId: string, page = 1, limit = 10, type?: RecordType | string) {
    try {
      const MAX_LIMIT = 100;
      const p = Math.max(Number(page) || 1, 1);
      const l = Math.min(Math.max(Number(limit) || 10, 1), MAX_LIMIT);
      const skip = (p - 1) * l;

      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, deletedAt: true },
      });

      if (!patient || patient.deletedAt) throw new NotFoundException('Patient not found');

      const where: any = { patientId };
      if (type) where.type = type as RecordType;

      const [entries, total] = await this.prisma.$transaction([
        this.prisma.medicalRecord.findMany({
          where,
          skip,
          take: l,
          orderBy: { createdAt: 'desc' },
          select: medicalRecordSelect,
        }),
        this.prisma.medicalRecord.count({ where }),
      ]);

      return ok('Medical record entries retrieved successfully', {
        data: entries,
        count: total,
        pagination: { page: p, limit: l, totalPages: Math.ceil(total / l) },
      });
    } catch (error) {
      console.error('getAllForPatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching medical record entries');
    }
  }

  /**
   * Get a single medical record entry by ID
   */
  async getById(id: string) {
    try {
      const entry = await this.prisma.medicalRecord.findUnique({
        where: { id },
        select: medicalRecordSelect,
      });

      if (!entry) throw new NotFoundException('Medical record entry not found');
      return ok('Medical record entry fetched', entry);
    } catch (error) {
      console.error('getById error:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching medical record entry');
    }
  }

  /**
   * Update an existing medical record entry
   */
  async updateMedicalRecord(id: string, dto: UpdateMedicalRecordDto) {
    try {
      const exists = await this.prisma.medicalRecord.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('Medical record entry not found');

      const data: Partial<UpdateMedicalRecordDto> = {};
      if (dto.type) data.type = dto.type as RecordType;
      if (dto.name) data.name = dto.name;
      if (dto.notes) data.notes = dto.notes;
      if (dto.diagnosedAt) data.diagnosedAt = dto.diagnosedAt;
      if (dto.resolvedAt) data.resolvedAt = dto.resolvedAt;
      if (dto.severity) data.severity = dto.severity as AllergySeverity;

      const updated = await this.prisma.medicalRecord.update({
        where: { id },
        data,
        select: medicalRecordSelect,
      });

      return ok('Medical record entry updated', updated);
    } catch (error) {
      console.error('updateMedicalRecord error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating medical record entry');
    }
  }

  /**
   * Delete a medical record entry by ID
   */
  async deleteMedicalRecord(id: string) {
    try {
      const exists = await this.prisma.medicalRecord.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('Medical record entry not found');

      await this.prisma.medicalRecord.delete({ where: { id } });
      return ok('Medical record entry deleted', { id });
    } catch (error) {
      console.error('deleteMedicalRecord error:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting medical record entry');
    }
  }
}
