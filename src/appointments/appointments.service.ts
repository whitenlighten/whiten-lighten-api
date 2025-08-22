import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAppointmentDto, PublicBookAppointmentDto, QueryAppointmentsDto } from './appointment.dto';
import { AppointmentStatus } from './appointments.enum';
import { MailService } from 'src/utils/mail.service';

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
      if (
        !dto.firstName ||
        !dto.lastName ||
        !dto.email ||
        !dto.service ||
        !dto.date ||
        !dto.phone
      ) {
        throw new BadRequestException('Missing required fields');
      }

      // Step 1: Self-register patient
      const patient = await this.patientsService.selfRegister({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      });

      // Step 2: Create appointment (pending by default)
      const appointment = await this.prisma.appointment.create({
        data: {
          patientId: patient.id,
          date: new Date(dto.date),
          reason: dto.reason,
          status: AppointmentStatus.PENDING,
          service: dto.service,
        },
      });

      // Step 3: Send mail to doctor and patient
      await this.mailService.sendAppointmentNotification(
        patient.email,
        'Appointment Booked',
        `Your appointment with doctor ${dto.doctorId} is booked for ${dto.date}.`,
      );
      // Send notification to all frontdesk users (do not await)
      this.prisma.user.findMany({ where: { role: 'FRONTDESK' } }).then((frontdesks) => {
        frontdesks.forEach((fd) => {
          if (fd.email) {
            this.mailService.sendAppointmentNotification(
              fd.email,
              'New Appointment',
              `A new appointment has been booked by ${patient.firstName} ${patient.lastName} on ${dto.date}.`,
            );
          }
        });
      });

      // Only send to doctor if doctorId is provided (do not await)
      if (dto.doctorId) {
        this.prisma.user.findUnique({ where: { id: dto.doctorId } }).then((doctor) => {
          if (doctor?.email) {
            this.mailService.sendAppointmentNotification(
              doctor.email,
              'New Appointment',
              `You have a new appointment with ${patient.firstName} ${patient.lastName} on ${dto.date}.`,
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
        update: { status?: AppointmentStatus; date?: Date; reason?: string }
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
      select: projection || undefined,
    });
  }
}
