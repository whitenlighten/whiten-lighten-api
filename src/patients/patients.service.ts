import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, PatientStatus, RegistrationType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePatientDto, QueryPatientsDto, UpdatePatientDto } from './patients.dto';
import { getPatientId } from 'src/utils/patient-id.util';
import { MailService } from 'src/utils/mail.service';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * =============================
   * CREATE patient (staff-created)
   * =============================
   */
  async create(createDto: CreatePatientDto, user: any) {
    if (![Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR].includes(user.role)) {
      throw new ForbiddenException('You are not allowed to create patients');
    }

    if (!createDto.dateOfBirth) {
      throw new BadRequestException('Date of birth is required');
    }
    if (!createDto.gender) {
      throw new BadRequestException('Gender is required');
    }

    if (!createDto.phone) {
      throw new BadRequestException('Phone number is required');
    }
    if (!createDto.email) {
      throw new BadRequestException('Email is required');
    }

    return this.prisma.patient.create({
      data: {
        ...createDto,
        status: PatientStatus.ACTIVE,
        createdById: user.id,
        dateOfBirth: new Date(createDto.dateOfBirth),
        gender: createDto.gender,
        phone: createDto.phone,
        email: createDto.email,
        address: createDto.address,
        patientId: await getPatientId(),
      },
    });
  }

  /**
   * =============================
   * SELF-REGISTER patient
   * =============================
   */
  async selfRegister(createDto: CreatePatientDto) {
    if (!createDto.email) {
      throw new BadRequestException('Email is required');
    }

    // 1. First, create a User with role PATIENT
    const user = await this.prisma.user.create({
      data: {
        email: createDto.email,
        password: '', // or null if you want OTP/Google login later
        role: 'PATIENT',
        phone: createDto.phone,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
      },
    });

    // 2. Then, create Patient linked to that User
    const patient = await this.prisma.patient.create({
      data: {
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        email: createDto.email,
        phone: createDto.phone,
        status: PatientStatus.PENDING,
        patientId: await getPatientId(),
        registrationType: RegistrationType.SELF,
        userId: user.id, // link patient → user
      },
    });

    return patient;
  }

  /**
   * =============================
   * APPROVE self-registered patient
   * =============================
   */
  async approve(patientId: string, user: any) {
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot approve other patients');
    }

    const patient = await this.prisma.patient.findUnique({ where: { patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.status !== PatientStatus.PENDING) {
      throw new BadRequestException('Only pending patients can be approved');
    }

    // Send mail after approval
    await this.mailService.sendPatientApproval(
      patient.email,
      `${patient.firstName} ${patient.lastName}`,
    );

    return this.prisma.patient.update({
      where: { patientId },
      data: { status: PatientStatus.ACTIVE, approvedById: user.id, approvedAt: new Date() },
    });
  }

  /**
   * =============================
   * GET all patients (paginated, field selection)
   * =============================
   */
  async findAll(query: QueryPatientsDto, user: any) {
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot list all patients');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // fields parsing
    let select: any = { id: true };
    if (query.fields) {
      const fields = query.fields.split(',').map((f) => f.trim());
      fields.forEach((field) => {
        if (field.length > 0) {
          select[field] = true;
        }
      });
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select,
      }),
    ]);

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  /**
   * =============================
   * GET single patient
   * =============================
   */
  async findOne(id: string, user: any) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        // eventually clinical notes can be included conditionally
        clinicalNotes: false,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return patient;
  }

  /**
   * =============================
   * GET single patient by patientId
   * =============================
   */
  async findOneByPatientId(patientId: string, user: any) {
    const patient = await this.prisma.patient.findUnique({
      where: { patientId },
      include: {
        clinicalNotes: false,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // if (user.role === Role.PATIENT && user.id !== patient.id) {
    //     throw new ForbiddenException('You can only view your own profile');
    // }

    return patient;
  }

  /**
   * =============================
   * UPDATE patient details
   * =============================
   */
  async update(id: string, updateDto: UpdatePatientDto, user: any) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (user.role === Role.PATIENT && patient.status !== PatientStatus.ACTIVE) {
      throw new ForbiddenException('Only active patients can update profile');
    }

    return this.prisma.patient.update({
      where: { id },
      data: { ...updateDto },
    });
  }

  /**
   * =============================
   * ARCHIVE patient
   * =============================
   */
  async archive(id: string, user: any) {
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot archive accounts');
    }

    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.patient.update({
      where: { id },
      data: { status: PatientStatus.ARCHIVED },
    });
  }

  /**
   * =============================
   * GET patient appointment history
   * =============================
   */
  async findAppointments(id: string, user: any) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.id) {
      throw new ForbiddenException('You can only view your own appointments');
    }

    return this.prisma.appointment.findMany({
      where: { patientId: id },
      orderBy: { date: 'desc' },
    });
  }
}
