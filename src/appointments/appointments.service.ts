import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAppointmentDto, PublicBookAppointmentDto, QueryAppointmentsDto } from './appointment.dto';
import { AppointmentStatus } from './appointments.enum';
import { MailService } from 'src/utils/mail.service';
import { PatientStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
    private mailService: MailService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({ data: { ...dto } });
  }

  async publicBook(dto: PublicBookAppointmentDto) {
    if (!dto.firstName || !dto.lastName || !dto.email || !dto.service || !dto.date || !dto.phone) {
      throw new BadRequestException('Missing required fields');
    }

    const appointmentDate = new Date(dto.date);
    const dateStr = appointmentDate.toLocaleDateString();
    const timeStr = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const appointmentDateTime = `${dateStr} at ${timeStr}`;

    // 🔎 Step 1: Check if patient already exists
    const existingPatient = await this.prisma.patient.findUnique({
      where: { email: dto.email },
    });

    let patient;

    if (existingPatient) {
      if (existingPatient.status === PatientStatus.ACTIVE) {
        // ✅ Case 1: Patient is already active → Just create appointment
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

        // Send only appointment confirmation mail
        await this.mailService.sendAppointmentNotificationToPatient(
          patient.email,
          patient.firstName,
          patient.patientId,
          appointmentDateTime,
        );

        return appointment;
      } else if (existingPatient.status === PatientStatus.PENDING) {
        // ⚠️ Case 2: Patient exists but not yet approved → update info + create appointment
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

        // Send only update email (reminding approval is pending)
        await this.mailService.sendPatientUpdatePendingApproval(
          patient.email,
          patient.firstName,
          appointmentDateTime,
        );

        return appointment;
      }
    }

    // 🆕 Case 3: Patient does not exist → normal self-register flow
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

    // Send confirmation email to patient
    await this.mailService.sendAppointmentNotificationToPatient(
      patient.email,
      patient.firstName,
      patient.patientId,
      appointmentDateTime,

    );

    // Send notification to frontdesk (fire & forget)
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

    // Send notification to doctor if doctorId provided
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
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
  }

  async updateAppointment(
    id: string,
    update: { status?: AppointmentStatus; date?: Date; reason?: string },
  ) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: update.status ?? appt.status,
        date: update.date ?? appt.date,
        reason: update.reason ?? appt.reason,
      },
    });
  }

  async findAll(query: QueryAppointmentsDto, projection?: any) {
    return this.prisma.appointment.findMany({
      where: { ...query },
      select: projection || undefined,
    });
  }

  async findOne(id: string, projection?: any) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  async findAllForMe(userId: string) {
    return this.prisma.appointment.findMany({
      where: {
        patient: {
          userId,
        },
      },
    });
  }
}
