import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

import * as nodemailer from 'nodemailer';

import { patientSelect } from './patient.select';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient..dto';
import { ok } from 'src/utils/response';
import { AuditLogger } from 'prisma/middleware/auditlogger';


@Injectable()
export class PatientService {
  private transporter: nodemailer.Transporter;
  private auditLogger: AuditLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    this.auditLogger = new AuditLogger(this.prisma);
  }

  // ==========================
  // Existing Patient Methods
  // ==========================
  async createPatient(dto: CreatePatientDto) {
    try {
      const patient = await this.prisma.patient.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          address: dto.address,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          emergencyContact: dto.emergencyContact,
        },
        select: patientSelect,
      });

      await this.auditLogger.log({
      action: 'CREATE',
      model: 'Patient',
      recordId: patient.id,
      newData: patient,
    });
      

      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', deletedAt: null },
        select: { email: true, fullName: true },
      });

      for (const admin of admins) {
        await this.transporter.sendMail({
          to: admin.email,
          subject: 'New Patient Registered',
          text: `A new patient (${patient.firstName} ${patient.lastName}) has registered.`,
        });
      }

      return ok('Patient created successfully', patient);
    } catch (error) {
      console.error('createPatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error creating patient');
    }
  }

  async getAllPatients(page = 1, limit = 10, search?: string) {
    try {
      const MAX_LIMIT = 50;
      const p = Math.max(Number(page) || 1, 1);
      const l = Math.min(Math.max(Number(limit) || 10, 1), MAX_LIMIT);
      const skip = (p - 1) * l;

      const where: any = { deletedAt: null };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [patients, total] = await this.prisma.$transaction([
        this.prisma.patient.findMany({ where, skip, take: l, select: patientSelect }),
        this.prisma.patient.count({ where }),
      ]);

      return ok('Patients retrieved successfully', {
        data: patients,
        count: total,
        pagination: { page: p, limit: l, totalPages: Math.ceil(total / l) },
      });
    } catch (error) {
      console.error('getAllPatients error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching patients');
    }
  }

  async getPatientById(id: string) {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id, deletedAt: null },
        select: patientSelect,
      });
      if (!patient) throw new NotFoundException('Patient not found');
      return ok('Patient fetched successfully', patient);
    } catch (error) {
      console.error('getPatientById error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching patient');
    }
  }

  async updatePatient(id: string, data: UpdatePatientDto) {
    try {
      const exists = await this.prisma.patient.findUnique({ where: { id, deletedAt: null } });
      if (!exists) throw new NotFoundException('Patient not found');

      const updatedPatient = await this.prisma.patient.update({
        where: { id },
        data,
        select: patientSelect,
      });

      const oldPatient = await this.prisma.patient.findUnique({ where: { id } });

      await this.auditLogger.log({
      action: 'UPDATE',
      model: 'Patient',
      recordId: id,
      oldData: oldPatient,
      newData: updatedPatient,
    });

      return ok('Patient updated successfully', updatedPatient);
    } catch (error) {
      console.error('updatePatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error updating patient');
    }
  }

  async deletePatient(id: string) {
    try {
      const exists = await this.prisma.patient.findUnique({ where: { id, deletedAt: null } });
      if (!exists) throw new NotFoundException('Patient not found');

      await this.prisma.patient.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      const oldPatient = await this.prisma.patient.findUnique({ where: { id } });

      await this.auditLogger.log({
      action: 'DELETE',
      model: 'Patient',
      recordId: id,
      oldData: oldPatient,
    });

      return ok('Patient deleted successfully');
    } catch (error) {
      console.error('deletePatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting patient');
    }
  }

  // ==========================
  // PreRegistration Methods
  // ==========================

  async createPreRegistration(dto: CreatePatientDto) {
    try {

      const generatePreRegCode = () => 'PRE' + Date.now();

      const preReg = await this.prisma.preRegistration.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          preRegCode: generatePreRegCode(),
        },
      });
      return ok('Pre-registration created successfully', preReg);
    } catch (error) {
      console.error('createPreRegistration error:', error);
      throw new InternalServerErrorException('Error creating pre-registration');
    }
  }

  // ==========================
  // Promotion from PreRegistration to Patient
  // ==========================
  async promotePreRegistration(preRegId: string, staffId: string) {
    try {
      const preReg = await this.prisma.preRegistration.findUnique({ where: { id: preRegId } });
      if (!preReg) throw new NotFoundException(`Pre-registration not found`);

      const patient = await this.prisma.patient.create({
        data: {
          firstName: preReg.firstName,
          lastName: preReg.lastName,
          email: preReg.email,
          phone: preReg.phone,
          dateOfBirth: preReg.dateOfBirth,
          // Optionally add default values for other required fields
          gender: 'OTHER',
          address: '',
          emergencyContact: {},
          preRegistrationId: preReg.id,
        },
        select: patientSelect,
      });

      // Optionally: log the promotion action
      // await this.auditLogService.logAction(staffId, 'PROMOTE_PRE_REGISTRATION', 'Patient', patient.id, { preRegistrationId: preReg.id });

      return ok('Pre-registration promoted to patient successfully', patient);
    } catch (error) {
      console.error('promotePreRegistration error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error promoting pre-registration');
    }
  }
}
