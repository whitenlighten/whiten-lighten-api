/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/utils/mail.service';
import { CreatePatientDto } from './dto/createPatient.dto';
import { UpdatePatientDto } from './dto/updatePatient.dto';
import { Prisma, Role } from '@prisma/client';


@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

   private async generatePatientId(): Promise<string> {
    const year = new Date().getFullYear();

    while (true) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      const patientId = `PAT-${year}-${rand}`;

      const exists = await this.prisma.patient.findUnique({
        where: { patientCode: patientId },
      });

      if (!exists) {
        return patientId; // ✅ unique ID
      }
    }
  }

  async create(dto: CreatePatientDto) {
    try {
      const patientCode = await this.generatePatientId();
      const patient = await this.prisma.patient.create({
        data: { ...dto, patientCode, status: 'APPROVED' },
      });
      return { message: 'Patient created', data: patient };
    } catch (error) {
      throw new InternalServerErrorException('Error creating patient');
    }
  }

  async selfRegister(dto: CreatePatientDto) {
    try {
      const patientCode = await this.generatePatientId();
      const patient = await this.prisma.patient.create({
        data: { ...dto, patientCode, status: 'PENDING' },
      });

  await this.mailService.sendAccountApprovalEmail(patient.email, patient.firstName || undefined);
      return { message: 'Self-registered. Confirmation email sent', data: patient, status: 'PENDING' };
    } catch (error) {
      throw new InternalServerErrorException('Error self-registering patient');
    }
  }

  async approve(id: string) {
    const patient = await this.prisma.patient.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await this.mailService.sendAccountApprovalEmail(patient.email, patient.firstName || undefined);

    return { message: 'Patient approved, email sent', data: patient };
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
  const where = search ?
  {
    OR: [
      { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      // ... rest of the fields
    ]
  }
  : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({ skip, take: limit, where }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data,
      count: total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    try {
      const updated = await this.prisma.patient.update({ where: { id }, data: dto });
      return { message: 'Patient updated', data: updated };
    } catch (error) {
      throw new InternalServerErrorException('Error updating patient');
    }
  }

  async delete(id: string) {
    try {
      const deleted = await this.prisma.patient.delete({ where: { id } });
      return { message: 'Patient deleted', data: deleted };
    } catch (error) {
      throw new InternalServerErrorException('Error deleting patient');
    }
  }
}
