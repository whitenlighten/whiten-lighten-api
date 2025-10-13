import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateDentalChartDto, CreateDentalRecallDto, CreateDentalTreatmentDto, QueryDto, UpdateDentalChartDto, UpdateDentalTreatmentDto } from './dental.dto';

@Injectable()
export class DentalService {
  private readonly logger = new Logger(DentalService.name);

  constructor(private prisma: PrismaService) {}

  // Helper: ensure only doctor/admin
 
  // --------------------
  // Dental Chart CRUD
  // --------------------
  // this helps us to record dental findings
  async createChart(dto: CreateDentalChartDto, id: string, user: any) {
    try {
    //  role checking
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients are not authorized to create dental charts.');
    }
      // Payient Id Validation
        const patient = await this.prisma.patient.findUnique({ where: { id : dto.patientId } });
        if (!patient) throw new NotFoundException('Patient not found');

      const chart = await this.prisma.dentalChart.create({
        data: {
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          chartData: dto.chartData,
          notes: dto.notes,
          createdById: id,
        },
      });
      return chart;
    } catch (err) {
      this.logger.error('createChart error', err);
      throw new InternalServerErrorException('Failed to create dental chart');
    }
  }

  // get all dental chart
  async getCharts(query: QueryDto) {
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.q) {
        // simple text search across notes and chartData
        where.OR = [
          { notes: { contains: query.q, mode: 'insensitive' } },
          { chartData: { contains: query.q, mode: 'insensitive' } },
        ];
      }

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

      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      this.logger.error('getCharts error', err);
      throw new InternalServerErrorException('Failed to fetch dental charts');
    }
  }

  // get dental chart by id
  async getChartById(id: string) {
    try {
      const chart = await this.prisma.dentalChart.findUnique({
        where: { id },
        include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
      });
      if (!chart) throw new NotFoundException('Dental chart not found');
      return chart;
    } catch (err) {
      this.logger.error('getChartById error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch dental chart');
    }
  }

  // to update a dental chart / dental finding
  async updateChart(id: string, dto: UpdateDentalChartDto) {
    try {
      const existing = await this.prisma.dentalChart.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Dental chart not found');

      const updated = await this.prisma.dentalChart.update({
        where: { id },
        data: {
          chartData: dto.chartData ?? existing.chartData,
          notes: dto.notes ?? existing.notes,
          appointmentId: dto.appointmentId ?? existing.appointmentId,
        },
      });
      return updated;
    } catch (err) {
      this.logger.error('updateChart error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update dental chart');
    }
  }

  // --------------------
  // Treatments CRUD
  /// Craete the treatement procedure and decription for a patient
  // --------------------
  async createTreatment(dto: CreateDentalTreatmentDto, PerformedByid: string) {
    try {
        const patient = await this.prisma.patient.findUnique({ 
            where: { id: dto.patientId } 
        });
        if (!patient) {
            throw new NotFoundException(`Patient with ID "${dto.patientId}" not found`);
        }
        if (dto.appointmentId) {
            const appointment = await this.prisma.appointment.findUnique({ where: 
                { id: dto.appointmentId }, });
            if (!appointment) {
                throw new NotFoundException(`Appointment with ID "${dto.appointmentId}" not found`);
            }
        }
      const treatment = await this.prisma.dentalTreatment.create({
        data: {
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          procedure: dto.procedure,
          description: dto.description,
          cost: dto.cost ?? null,
          performedBy: PerformedByid ?? null,
        },
      });
      return treatment;
    } catch (err) {
      this.logger.error('createTreatment error', err);
      throw new InternalServerErrorException('Failed to create treatment');
    }
  }

  // to get all treatment description for all
  async getTreatments(query: QueryDto) {
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.q) {
        where.OR = [
          { procedure: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ];
      }

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
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      this.logger.error('getTreatments error', err);
      throw new InternalServerErrorException('Failed to fetch treatments');
    }
  }

  
  // to get all treatment for a patient by Id
  async getTreatmentById(id: string) {
    try {
      const treatment = await this.prisma.dentalTreatment.findUnique({
        where: { id },
        include: { patient: { select: { id: true, firstName: true, lastName: true, patientId: true } } },
      });
      if (!treatment) throw new NotFoundException('Treatment not found');
      return treatment;
    } catch (err) {
      this.logger.error('getTreatmentById error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to fetch treatment');
    }
  }

  async updateTreatment(id: string, dto: UpdateDentalTreatmentDto,) {
    try {
      const existing = await this.prisma.dentalTreatment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Treatment not found');

      const updated = await this.prisma.dentalTreatment.update({
        where: { id },
        data: {
          procedure: dto.procedure ?? existing.procedure,
          description: dto.description ?? existing.description,
          cost: dto.cost ?? existing.cost,// Use the provided userId
          updatedAt: new Date(), // Update the updatedAt field
        },
      });
      return updated;
    } catch (err) {
      this.logger.error('updateTreatment error', err);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update treatment');
    }
  }

  // --------------------
  // Recalls CRUD
  // --------------------
  async createRecall(dto: CreateDentalRecallDto, userId: string) {
    try {
        const patient = await this.prisma.patient.findUnique({ 
            where: { id: dto.patientId } 
            });
          
        if (!patient) throw new NotFoundException(' not found');

      const recall = await this.prisma.dentalRecall.create({
        data: {
          patientId: dto.patientId,
          recallDate: new Date(dto.recallDate),
          reason: dto.reason,
          createdById: userId,
        },
      });
      return recall;
    } catch (err) {
      this.logger.error('createRecall error', err);
      throw new InternalServerErrorException('Failed to create recall');
    }
  }

  async getRecalls(query: QueryDto) {
    try {
      const page = Math.max(parseInt(query.page || '1', 10), 1);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.q) {
        where.reason = { contains: query.q, mode: 'insensitive' };
      }

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
      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err) {
      this.logger.error('getRecalls error', err);
      throw new InternalServerErrorException('Failed to fetch recalls');
    }
  }
}
