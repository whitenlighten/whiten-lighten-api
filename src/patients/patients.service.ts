import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role, PatientStatus, RegistrationType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePatientDto, QueryPatientsDto, SelfRegisterPatientDto, UpdatePatientDto } from './patients.dto';
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
 async selfRegister(createDto: SelfRegisterPatientDto) {
  if (!createDto.email) {
    throw new BadRequestException('Email is required');
  }

   // Check for an existing user with the same email or phone number
  const existingUser = await this.prisma.user.findFirst({
    where: {
      OR: [
        { email: createDto.email.toLowerCase() },
        { phone: createDto.phone }
      ]
    },
    include: {  Patient: true },
  }); 

  if (existingUser) {
    if (existingUser.email === createDto.email.toLowerCase()) {
      throw new BadRequestException('A user with this email already exists.');
    }
    if (existingUser.phone === createDto.phone) {
      throw new BadRequestException('A user with this phone number already exists.');
    }
    // If the user exists but is not a patient, this is an unexpected state, throw an error or handle
    throw new BadRequestException('A user with this email already exists but is not a patient.');
  } 

  // Scenario 2: User does not exist, proceed with creation
  try {
    const user = await this.prisma.user.create({
      data: {
        email: createDto.email.toLowerCase(),
        password: '',
        role: 'PATIENT',
        phone: createDto.phone,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
      },
    });

    const patient = await this.prisma.patient.create({
      data: {
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        email: createDto.email.toLowerCase(),
        phone: createDto.phone,
        gender: createDto.gender,
        status: PatientStatus.PENDING,
        patientId: await getPatientId(),
        registrationType: RegistrationType.SELF,
        userId: user.id,
      },
    });

    return patient;
  } catch (error) {
    console.error('Error during self-registration:', error);
    throw new InternalServerErrorException('Failed to self-register patient. Please try again later.');
  }
}

  /**
   * =============================
   * APPROVE self-registered patient
   * =============================
   */
  async approve(id: string, user: any) {
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot approve other patients');
    }

    const patient = await this.prisma.patient.findUnique({ where: { id: id } });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.status !== PatientStatus.PENDING) {
      throw new BadRequestException('Only pending patients can be approved');
    }

    // Send mail after approval
    try {
    await this.mailService.sendPatientApproval(
      patient.email,
      `${patient.firstName} ${patient.lastName}`,
    );
    console.log(`Approval email successfully sent to ${patient.email}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    // This will provide a more specific error message to help you debug.
    // The error object will contain details about the failure (e.g., wrong password, connection refused).
    throw new BadRequestException('Failed to send patient approval email. Check mail service configuration or network connection.');
  }

  // If email sending is successful or handled, proceed to update the patient status
  return this.prisma.patient.update({
    where: { id: patient.id },
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

    if (user.role === Role.PATIENT && user.id !== patient.userId) {
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

    if (user.role === Role.PATIENT && user.id !== patient.userId) { // This was already correct, but good to confirm
      throw new ForbiddenException('You can only view your own profile');
    }

    return patient;
  }

  /**
   * =============================
   * UPDATE patient details
   * =============================
   */
  async update(id: string, updateDto: UpdatePatientDto, user: { id: string; role: Role }) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (user.role === Role.PATIENT && patient.status !== PatientStatus.ACTIVE) {
      throw new ForbiddenException('Only active patients can update profile');
    }

    const dataToUpdate: any = { ...updateDto };

    // Convert dateOfBirth string to Date object if it exists
    if (updateDto.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(updateDto.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { id },
      data: dataToUpdate,
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
  async findAppointments(id: string, user: any, query: QueryPatientsDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.userId) { // This was also correct, good to confirm
      throw new ForbiddenException('You can only view your own appointments');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where = { patientId: id };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }
}
