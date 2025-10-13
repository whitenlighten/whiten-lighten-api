import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateDentalChartDto, CreateDentalRecallDto, CreateDentalTreatmentDto, QueryDto, UpdateDentalChartDto, UpdateDentalTreatmentDto } from './dental.dto';

@Injectable()
export class DentalService {
  private readonly logger = new Logger(DentalService.name);

  constructor(private prisma: PrismaService) {}

  // --------------------
  // Dental Chart CRUD
  // --------------------
  async createChart(dto: CreateDentalChartDto, createdById: string, user: any) {
    console.log('createChart called with:', { dto, createdById, user });
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      console.log('Patient lookup result:', patient);

      if (!patient) throw new NotFoundException('Patient not found');

      const chart = await this.prisma.dentalChart.create({
        data: {
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          chartData: dto.chartData,
          notes: dto.notes,
          createdById: createdById,
        },
      });
      console.log('Chart created successfully:', chart);
      return chart;
    } catch (err) {
      console.error('createChart error:', err);
      this.logger.error('createChart error', err);
      throw new InternalServerErrorException('Failed to create dental chart');
    }
  }

  async getCharts(query: QueryDto) {
    console.log('getCharts called with:', query);
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      console.log('Pagination:', { page, limit, skip });

      const where: any = {};
      if (query.q) {
        where.OR = [
          { notes: { contains: query.q, mode: 'insensitive' } },
          { chartData: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      console.log('Prisma where clause:', where);

      const [total, data] = await this.prisma.$transaction([
        this.prisma.dentalChart.count({ where }),
        this.prisma.dentalChart.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, patientId: true } },
          },
        }),
      ]);

      console.log('getCharts results:', { total, count: data.length });
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      console.error('getCharts error:', err);
      this.logger.error('getCharts error', err);
      throw new InternalServerErrorException('Failed to fetch dental charts');
    }
  }

  async getChartById(id: string) {
    console.log('getChartById called with:', id);
    try {
      const chart = await this.prisma.dentalChart.findUnique({
        where: { id },
        include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
      });
      console.log('getChartById result:', chart);

      if (!chart) throw new NotFoundException('Dental chart not found');
      return chart;
    } catch (err) {
      console.error('getChartById error:', err);
      this.logger.error('getChartById error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch dental chart');
    }
  }

  async updateChart(CharId: string, dto: UpdateDentalChartDto, userId: string) {
    console.log('updateChart called with:', { CharId, dto, userId });
    try {
      const existing = await this.prisma.dentalChart.findUnique({ where: { id : CharId } });
      console.log('Existing chart:', existing);

      if (!existing) throw new NotFoundException('Dental chart not found');

      const updated = await this.prisma.dentalChart.update({
        where: { id : CharId },
        data: {
          chartData: dto.chartData,
          notes: dto.notes ?? existing.notes,
          appointmentId: dto.appointmentId ?? existing.appointmentId,
          updatedBy: userId,
        },
      });
      console.log('Chart updated successfully:', updated);
      return updated;
    } catch (err) {
      console.error('updateChart error:', err);
      this.logger.error('updateChart error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update dental chart');
    }
  }

  // --------------------
  // Treatments CRUD
  // --------------------
  async createTreatment(dto: CreateDentalTreatmentDto, performedById: string) {
    console.log('createTreatment called with:', { dto, performedById });
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      console.log('Patient lookup:', patient);

      if (!patient) throw new NotFoundException(`Patient with ID "${dto.patientId}" not found`);

      if (dto.appointmentId) {
        const appointment = await this.prisma.appointment.findUnique({ where: { id: dto.appointmentId } });
        console.log('Appointment lookup:', appointment);

        if (!appointment) throw new NotFoundException(`Appointment with ID "${dto.appointmentId}" not found`);
      }

      const treatment = await this.prisma.dentalTreatment.create({
        data: {
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          procedure: dto.procedure,
          description: dto.description,
          cost: dto.cost ?? null,
          performedBy: performedById,
        },
      });
      console.log('Treatment created:', treatment);
      return treatment;
    } catch (err) {
      console.error('createTreatment error:', err);
      this.logger.error('createTreatment error', err);
      throw new InternalServerErrorException('Failed to create treatment');
    }
  }

  async getTreatments(query: QueryDto) {
    console.log('getTreatments called with:', query);
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;
      console.log('Pagination:', { page, limit, skip });

      const where: any = {};
      if (query.q) {
        where.OR = [
          { procedure: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ];
      }

      console.log('Prisma where clause for treatments:', where);

      const [total, data] = await this.prisma.$transaction([
        this.prisma.dentalTreatment.count({ where }),
        this.prisma.dentalTreatment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
        }),
      ]);

      console.log('getTreatments results:', { total, count: data.length });
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      console.error('getTreatments error:', err);
      this.logger.error('getTreatments error', err);
      throw new InternalServerErrorException('Failed to fetch treatments');
    }
  }

  async getTreatmentById(id: string) {
    console.log('getTreatmentById called with:', id);
    try {
      const treatment = await this.prisma.dentalTreatment.findUnique({
        where: { id },
        include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
      });
      console.log('Treatment result:', treatment);

      if (!treatment) throw new NotFoundException('Treatment not found');
      return treatment;
    } catch (err) {
      console.error('getTreatmentById error:', err);
      this.logger.error('getTreatmentById error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch treatment');
    }
  }

  async updateTreatment(id: string, dto: UpdateDentalTreatmentDto, userId: string) {
    console.log('updateTreatment called with:', { id, dto, userId });
    try {
      const existing = await this.prisma.dentalTreatment.findUnique({ where: { id } });
      console.log('Existing treatment:', existing);

      if (!existing) throw new NotFoundException('Treatment not found');

      const updated = await this.prisma.dentalTreatment.update({
        where: { id },
        data: {
          procedure: dto.procedure ?? existing.procedure,
          description: dto.description ?? existing.description,
          cost: dto.cost ?? existing.cost,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });
      console.log('Treatment updated successfully:', updated);
      return updated;
    } catch (err) {
      console.error('updateTreatment error:', err);
      this.logger.error('updateTreatment error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update treatment');
    }
  }

  // --------------------
  // Recalls CRUD
  // --------------------
  async createRecall(dto: CreateDentalRecallDto, userId: string) {
    console.log('createRecall called with:', { dto, userId });
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      console.log('Patient lookup:', patient);

      if (!patient) throw new NotFoundException(`Patient with ID "${dto.patientId}" not found`);

      const recallDateObj = new Date(dto.recallDate);
      if (isNaN(recallDateObj.getTime())) {
        throw new BadRequestException(`Invalid recallDate format: "${dto.recallDate}". Please use a valid ISO 8601 date string.`);
      }

      const recall = await this.prisma.dentalRecall.create({
        data: {
          patientId: dto.patientId,
          recallDate: recallDateObj,
          reason: dto.reason,
          createdById: userId,
        },
      });
      console.log('Recall created successfully:', recall);
      return recall;
    } catch (err) {
      console.error('createRecall error:', err);
      this.logger.error('createRecall error', err);
      throw new InternalServerErrorException('Failed to create recall');
    }
  }

  async getRecalls(query: QueryDto) {
    console.log('getRecalls called with:', query);
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;
      console.log('Pagination:', { page, limit, skip });

      const where: any = {};
      if (query.q) {
        where.reason = { contains: query.q, mode: 'insensitive' };
      }

      console.log('Prisma where clause for recalls:', where);

      const [total, data] = await this.prisma.$transaction([
        this.prisma.dentalRecall.count({ where }),
        this.prisma.dentalRecall.findMany({
          where,
          skip,
          take: limit,
          orderBy: { recallDate: 'desc' },
          include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
        }),
      ]);

      console.log('getRecalls results:', { total, count: data.length });
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      console.error('getRecalls error:', err);
      this.logger.error('getRecalls error', err);
      throw new InternalServerErrorException('Failed to fetch recalls');
    } 
  }
}
