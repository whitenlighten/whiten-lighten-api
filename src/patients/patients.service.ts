import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { Role, PatientStatus, RegistrationType, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AddPatientHistoryDto, CreatePatientDto, QueryPatientsDto, SelfRegisterPatientDto, UpdatePatientDto } from './patients.dto';
import { getPatientId } from 'src/utils/patient-id.util';
import { NotificationsService } from 'src/notification/notifications.service';


@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
   
  ) {}

  /**
   * =============================
   * CREATE patient (staff-created)
   * =============================
   */
  async create(createDto: CreatePatientDto,) {

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

    const patient = await this.prisma.patient.create({
      data: {
        ...createDto,
        status: PatientStatus.ACTIVE,
        dateOfBirth: new Date(createDto.dateOfBirth),
        gender: createDto.gender,
        age: createDto.age ? parseInt(createDto.age, 10) : undefined,
        phone: createDto.phone,
        email: createDto.email,
        address: createDto.address,
        patientId: await getPatientId(),
      },
    });

    // 👇 Notify the patient that their profile was created
    await this.notificationsService.create({
      title: 'Welcome to the Clinic!',
      message: `Dear ${patient.firstName}, your patient profile has been successfully created.`,
      type: 'PATIENT',
      recipientId: patient.id,
    });

    // Return only the input data plus key generated fields
    const { email, firstName, lastName, phone, gender, dateOfBirth, address, age, maritalStatus, bloodGroup } = createDto;
    return {
      id: patient.id,
      patientId: patient.patientId,
      status: patient.status,
      email,
      firstName,
      lastName,
      phone, gender, dateOfBirth, address, age,
      maritalStatus,
      bloodGroup
    };
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

  // Check for an existing patient with the same email or phone number
  const existingPatient = await this.prisma.patient.findFirst({
    where: {
      OR: [
        { email: createDto.email.toLowerCase() },
        { phone: createDto.phone }
      ]
    }
  });

  if (existingPatient) {
    throw new ConflictException('A patient with this email or phone number already exists.');
  }
   // Check for an existing user with the same email or phone number
  const existingUser = await this.prisma.user.findFirst({
    where: {
      OR: [
        { email: createDto.email.toLowerCase() },
        { phone: createDto.phone }
      ]
    },
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
        age: createDto.age ? parseInt(createDto.age, 10) : undefined,
        status: PatientStatus.PENDING,
        patientId: await getPatientId(),
        registrationType: RegistrationType.SELF,
        userId: user.id,
      },
    });

     await this.notificationsService.create({
      title: 'Registration Submitted',
      message: `Dear ${patient.firstName}, your registration has been received and is pending approval.`,
      type: 'PATIENT',
      recipientId: patient.id,
    });

    // Return only the input data plus key generated fields
    const { email, firstName, lastName, phone, gender, age } = createDto;
    return {
      id: patient.id,
      patientId: patient.patientId,
      status: patient.status,
      email,
      firstName,
      lastName, phone, gender, age
    };
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
        { phone: { contains: query.q, mode: 'insensitive' } },
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

    const total = await this.prisma.patient.count({ where });
    const data = await this.prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select,
    });

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
    console.log(`[update] Starting update for patient ID: ${id}`);
    console.log(`[update] Received DTO:`, updateDto);
    console.log(`[update] User performing update:`, user);


    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (user.role === Role.PATIENT && user.id !== patient.userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (user.role === Role.PATIENT && patient.status !== PatientStatus.ACTIVE) {
      throw new ForbiddenException('Only active patients can update profile');
    }

    // If email is being updated, check if it's already taken by another patient
    if (updateDto.email && updateDto.email !== patient.email) {
      const existingPatientWithEmail = await this.prisma.patient.findUnique({
        where: { email: updateDto.email },
      });

      if (existingPatientWithEmail && existingPatientWithEmail.id !== id) {
        console.error(`[update] Email conflict: ${updateDto.email} is already in use by patient ID ${existingPatientWithEmail.id}`);
        throw new ConflictException('This email address is already in use by another patient.');
      }
    }

    // If phone is being updated, check if it's already taken by another patient
    if (updateDto.phone && updateDto.phone !== patient.phone) {
      const existingPatientWithPhone = await this.prisma.patient.findUnique({
        where: { phone: updateDto.phone },
      });

      if (existingPatientWithPhone && existingPatientWithPhone.id !== id) {
        console.error(`[update] Phone conflict: ${updateDto.phone} is already in use by patient ID ${existingPatientWithPhone.id}`);
        throw new ConflictException('This phone number is already in use by another patient.');
      }
    }

    const dataToUpdate: any = { ...updateDto };

    // Convert dateOfBirth string to Date object if it exists
    if (updateDto.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(updateDto.dateOfBirth);
    }
    // Convert age string to number if it exists
    if (updateDto.age !== undefined) {
      dataToUpdate.age = parseInt(updateDto.age, 10);
    }

    console.log('[update] Data prepared for Prisma:', dataToUpdate);

    try {
      const updated = await this.prisma.patient.update({ where: { id }, data: dataToUpdate });
      console.log('[update] Successfully updated patient in DB:', updated);

      // 👇 Notify patient of profile update
      await this.notificationsService.create({
        title: 'Profile Updated',
        message: `Your patient profile has been successfully updated.`,
        type: 'PATIENT',
        recipientId: updated.id,
      });
      console.log('[update] Notification sent successfully.');

      // Return the full updated patient object
      return updated;
    } catch (error) {
      console.error('[update] Error during prisma.patient.update:', error);
      // Check if the error is a known Prisma error for unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('email')) {
          throw new ConflictException('This email address is already in use.');
        }
        if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('phone')) {
          throw new ConflictException('This phone number is already in use.');
        }
      }
      throw new InternalServerErrorException('Failed to update patient details.');
    }
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

     const archive = await this.prisma.patient.update({
      where: { id },
      data: { status: PatientStatus.ARCHIVED },
    });

     await this.notificationsService.create({
      title: 'Profile Archived',
      message: `Your profile has been archived by an administrator.`,
      type: 'PATIENT',
      recipientId: patient.id,
    });


    return archive;
  }

  /**
   * =============================
   * UNARCHIVE patient
   * =============================
   */
  async unarchive(id: string, user: any) {
    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot unarchive accounts');
    }

    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    if (patient.status !== PatientStatus.ARCHIVED) {
      throw new BadRequestException('Only archived patients can be restored.');
    }

    const restoredPatient = await this.prisma.patient.update({
      where: { id },
      data: { status: PatientStatus.ACTIVE },
    });

    // You can optionally send a notification here

    return restoredPatient;
  }

   async getallarchived(user: any, query: QueryPatientsDto){ // Removed unused 'id'
    if (![Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view archived patients.');
    }

    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where = { status: PatientStatus.ARCHIVED };

    const total = await this.prisma.patient.count({ where });
    const data = await this.prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (total === 0) throw new NotFoundException('No archived patients found');

    return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
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

    const total = await this.prisma.appointment.count({ where });
    const data = await this.prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
    });

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  async getHistory( query: QueryPatientsDto, user: any) {
    console.log('Query parameters:', query);
    console.log('User attempting access:', user.id, 'Role:', user.role);

    if (user.role === Role.PATIENT) {
      throw new ForbiddenException('Patients cannot list patient history');
    }
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    console.log(`Pagination: Page ${page}, Limit ${limit}, Skip ${skip}`);

    const where: any = { };
    if (query.q) {
      where.OR = [
        { notes: { contains: query.q, mode: 'insensitive' } },
        { type: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    console.log('Database WHERE clause:', JSON.stringify(where));

    const total = await this.prisma.patientHistory.count({ where });
    const data = await this.prisma.patientHistory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

     console.log(`Total records found: ${total}, Records fetched: ${data.length}`);

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  async addHistory(patientId: string,  type: 'MEDICAL' | 'DENTAL', // 👈 New explicit 'type' argument
  notes: string,   createdBy: any) {
    // The role check is handled by the decorator in the controller
    // Check if the patient exists
    console.log(`Attempting to add history for patient ID: ${patientId}`);
    console.log('History created by user ID:', createdBy);
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found.`);
    }
     console.log(`Patient found: ${patientId}. Proceeding to create history record.`);

    const history = await this.prisma.patientHistory.create({
      data: {
        patientId: patientId,
        type: type,
        notes:notes,
        createdById: createdBy.id, // 👈 Pass the creator's ID
      },
    });

    if (!history) throw new InternalServerErrorException('Unable to add history');

    console.log(`Successfully created patient history record with ID: ${history.id}`);


    return history;
  }

  async logCommunication(patientId: string, type: string, message: string) {
  // 1. Check if the patient exists
  const patient = await this.prisma.patient.findUnique({ 
    where: { id: patientId },
  });

  if (!patient) {
    throw new NotFoundException('Patient not found');
  }

  // 2. Log the communication and RETURN the result
  const communication = await this.prisma.communicationLog.create({ // 👈 FIX: Added 'await' and wrapped arguments in {}
    data: { 
      patientId,
      type, 
      message,
    },
  });

  await this.notificationsService.create({
      title: ' communication looged',
      message: `You have sucessfully log a communication.`,
      type: 'PATIENT',
      recipientId: patient.id,
    });

 
  return communication;
}

async getCommunications( patientId: string, query: any, user: any ) {
  console.log('Query parameters:', query);
  console.log('User attempting access:', user.id, 'Role:', user.role);

  if (user.role === 'PATIENT' && user.id !== patientId) { // Example of stricter check
    throw new ForbiddenException('Patients cannot list communication logs for other patients');
  }

  const page = parseInt(query.page || '1', 10);
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const skip = (page - 1) * limit;
  console.log(`Pagination: Page ${page}, Limit ${limit}, Skip ${skip}`);

  const where: any = { patientId: patientId };

  if (query.q) {
    where.OR = [
      { message: { contains: query.q, mode: 'insensitive' } }, // Search the 'message' field
      { type: { contains: query.q, mode: 'insensitive' } },   // Search the 'type' field
    ];
  }

  console.log('Database WHERE clause:', JSON.stringify(where));
  // 4. Execute Transaction: Count and Fetch Data
  const total = await this.prisma.communicationLog.count({ where }); // Target the correct table
  const data = await this.prisma.communicationLog.findMany({       // Target the correct table
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total records found: ${total}, Records fetched: ${data.length}`);

  // 5. Return Paginated Results
  return {
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
    data,
  };
}


 
}
  