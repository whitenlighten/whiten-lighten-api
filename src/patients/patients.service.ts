import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

import * as nodemailer from 'nodemailer';

import { patientSelect } from './patient.select';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient..dto';
import { ok } from 'src/utils/response';


@Injectable()
export class PatientService {
  private transporter: nodemailer.Transporter;

  // Inject PrismaService and ConfigService for flexibility
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService, // <-- inject config for env variables
  ) {
    // Create nodemailer transporter using environment variables
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }
  async createPatient(dto: CreatePatientDto) {
    try {
      // 1. Save patient
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

      // 2. Fetch admins
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', deletedAt: null },
        select: { email: true, fullName: true },
      });

      // 3. Notify admins
      for (const admin of admins) {
        await this.transporter.sendMail({
          to: admin.email,
          subject: 'New Patient Registered',
          text: `A new patient (${patient.firstName} ${patient.lastName}) has registered.`,
        });
      }

      // 4. Return structured response
      return ok('Patient created successfully', patient);
    } catch (error) {
      console.error('createPatient error:', error);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
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
      pagination: {
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    console.error('getAllPatients error:', error);
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Error fetching patients');
  }
}
    // return all patients (not soft deleted)
  

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
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching patient');
    }
    // return single patient by ID
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

      return ok('Patient updated successfully', updatedPatient);
    } catch (error) {
      console.error('updatePatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating patient');
    }
    // update patient record
  }

  async deletePatient(id: string) {
    try {
      const exists = await this.prisma.patient.findUnique({ where: { id, deletedAt: null } });
      if (!exists) throw new NotFoundException('Patient not found');

      await this.prisma.patient.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return ok('Patient deleted successfully');
    } catch (error) {
      console.error('deletePatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting patient');
    }
  }
}
