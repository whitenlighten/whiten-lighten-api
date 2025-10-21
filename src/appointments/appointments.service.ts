import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAppointmentDto, PublicBookAppointmentDto, QueryAppointmentsDto } from './appointment.dto';
import { AppointmentStatus } from './appointments.enum';
import { MailService } from 'src/utils/mail.service';
import { PatientStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
    private mailService: MailService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    this.logger.debug(`Attempting to create appointment for patientId: ${dto.patientId}`);
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      if (!patient) throw new NotFoundException('Patient not found');
      if (patient.status !== PatientSbgtus.ACTIVE) throw new BadRequestException('Patient is not active');
      console.log('Patient found:', patient);


      const appointment = await this.prisma.appointment.create({
        data: {
          ...dto,
          status: AppointmentStatus.PENDING,
          date: new Date(dto.date),
        },
      });
      this.logger.log(`Successfully created appointment ${appointment.id}`);
      return appointment;
    } catch (err: any) {
      this.logger.error(`Failed to create appointment for patientId: ${dto.patientId}`, err.stack);
      throw new InternalServerErrorException('Could not create appointment.');
    }
  }

  async publicBook(dto: PublicBookAppointmentDto) {
    this.logger.debug(`Public booking attempt for email: ${dto.email}`);
    try {
      if (!dto.firstName || !dto.lastName || !dto.email || !dto.service || !dto.date || !dto.phone) {
        throw new BadRequestException('Missing required fields');
      }

      const appointmentDate = new Date(dto.date);
      const dateStr = appointmentDate.toLocaleDateString();
      const timeStr = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const appointmentDateTime = `${dateStr} at ${timeStr}`;

      this.logger.debug(`Checking for existing patient with email: ${dto.email}`);
      const existingPatient = await this.prisma.patient.findUnique({
        where: { email: dto.email },
      });

      let patient;

      if (existingPatient) {
        this.logger.log(`Patient found with ID: ${existingPatient.id} and status: ${existingPatient.status}`);
        if (existingPatient.status === PatientStatus.ACTIVE) {
          patient = existingPatient;
          const appointment = await this.prisma.appointment.create({
            data: {
              patientId: patient.id,
              date: appointmentDate,
              reason: dto.reason,
              status: AppointmentStatus.PENDING,
              service: dto.service,
            },
          });

          this.logger.log(`Sending appointment notification to existing active patient: ${patient.email}`);
          await this.mailService.sendAppointmentNotificationToPatient(
            patient.email,
            patient.firstName,
            patient.patientId,
            appointmentDateTime,
          );

          return appointment;
        } else if (existingPatient.status === PatientStatus.PENDING) {
          this.logger.log(`Updating existing pending patient: ${existingPatient.id}`);
          patient = await this.prisma.patient.update({
            where: { id: existingPatient.id },
            data: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
            },
          });

          const appointment = await this.prisma.appointment.create({
            data: {
              patientId: patient.id,
              date: appointmentDate,
              reason: dto.reason,
              status: AppointmentStatus.PENDING,
              service: dto.service,
            },
          });

          this.logger.log(`Sending pending approval update to patient: ${patient.email}`);
          await this.mailService.sendPatientUpdatePendingApproval(
            patient.email,
            patient.firstName,
            appointmentDateTime,
          );

          return appointment;
        }
      }

      this.logger.log(`No existing patient found. Registering new patient with email: ${dto.email}`);
      patient = await this.patientsService.selfRegister({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      });

      const appointment = await this.prisma.appointment.create({
        data: {
          patientId: patient.id,
          date: appointmentDate,
          reason: dto.reason,
          status: AppointmentStatus.PENDING,
          service: dto.service,
        },
      });
      this.logger.log(`New appointment ${appointment.id} created for new patient ${patient.id}`);

      this.logger.log(`Sending appointment notification to new patient: ${patient.email}`);
      await this.mailService.sendAppointmentNotificationToPatient(
        patient.email,
        patient.firstName,
        patient.patientId,
        appointmentDateTime,
      );

      this.logger.log('Sending notifications to frontdesk and doctor (if applicable).');
      this.prisma.user.findMany({ where: { role: 'FRONTDESK' } }).then((frontdesks) => {
        frontdesks.forEach((fd) => {
          if (fd.email) {
            this.mailService.sendAppointmentNotificationToFrontdesk(
              fd.email,
              'New Appointment',
              `A new appointment has been booked by ${patient.firstName} ${patient.lastName} for ${dateStr} at ${timeStr}.`,
            );
          }
        });
      });

      if (dto.doctorId) {
        this.prisma.user.findUnique({ where: { id: dto.doctorId } }).then((doctor) => {
          if (doctor?.email) {
            this.mailService.sendAppointmentNotification(
              doctor.email,
              'New Appointment Booked',
              `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\n` +
                `You have a new appointment scheduled with ${patient.firstName} ${patient.lastName}.\n\n` +
                `Date: ${dateStr}\nTime: ${timeStr}\nService: ${dto.service}\n` +
                (dto.reason ? `Reason: ${dto.reason}\n` : '') +
                `\nPlease log in to your dashboard for more details.\n\nThank you!`,
            );
          }
        });
      }

      return appointment;
    } catch (err: any) {
      this.logger.error(`Failed during public booking for email ${dto.email}: ${err.message}`, err.stack);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Could not book appointment.');
    }
  }

  async approve(id: string) {

    return this.updateStatus(id, AppointmentStatus.CONFIRMED);
  }

  async cancel(id: string) {
    return this.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async complete(id: string) {
    return this.updateStatus(id, AppointmentStatus.COMPLETED);
  }

  private async updateStatus(id: string, status: AppointmentStatus) {
    this.logger.debug(`Attempting to update status of appointment ${id} to ${status}`);
    try {
      if (!status) throw new BadRequestException('Status is required');
      const appt = await this.prisma.appointment.findUnique({ where: { id } });
      if (!appt) throw new NotFoundException('Appointment not found');

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: { status: status as any },
      });
      this.logger.log(`Successfully updated status for appointment ${id} to ${status}`);
      return updatedAppointment;
    } catch (err: any) {
      this.logger.error(`Failed to update status for appointment ${id}: ${err.message}`, err.stack);
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Could not update appointment status.');
    }
  }

  async updateAppointment(
    id: string,
    update: { status?: AppointmentStatus; date?: Date; reason?: string },
  ) {
    this.logger.debug(`Attempting to update appointment ${id}`);
    try {
      const appt = await this.prisma.appointment.findUnique({ where: { id } });
      if (!appt) throw new NotFoundException('Appointment not found');

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: {
          status: (update.status ?? appt.status) as any,
          date: update.date ?? appt.date,
          reason: update.reason ?? appt.reason,
        },
      });
      this.logger.log(`Successfully updated appointment ${id}`);
      return updatedAppointment;
    } catch (err: any) {
      this.logger.error(`Failed to update appointment ${id}: ${err.message}`, err.stack);
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Could not update appointment.');
    }
  }

  

 async findAll(query: QueryAppointmentsDto) {
  this.logger.debug(`Finding all appointments with query: ${JSON.stringify(query)}`);
  try {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.q) {
      where.OR = [
        { reason: { contains: query.q, mode: 'insensitive' } },
        { service: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          patient: true,
          doctor: {
            select: { id: true, firstName: true, lastName: true, email: true, specialization: true },
          },
        },
      }),
    ]);

    this.logger.log(`Found ${data.length} of ${total} appointments.`);
    return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
  } catch (err: any) {
    this.logger.error(`Failed to find all appointments: ${err.message}`, err.stack);
    throw new InternalServerErrorException('Could not retrieve appointments.');
  }
}

  async findOne(id: string, projection?: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true, // Return all patient scalar fields
        doctor: { // Select specific fields for doctor
          select: { id: true, firstName: true, lastName: true, email: true, specialization: true },
        },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findAllForMe(userId: string) {
    this.logger.debug(`Finding all appointments for user: ${userId}`);
    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          patient: {
            userId,
          },
        },
      });
      this.logger.log(`Found ${appointments.length} appointments for user ${userId}`);
      return appointments;
    } catch (err: any) {
      this.logger.error(`Failed to find appointments for user ${userId}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Could not retrieve your appointments.');
    }
  }


}
