import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateAppointmentDto,
  PublicBookAppointmentDto,
  QueryAppointmentsDto,
  UpdateAppointmentDto,
} from './appointment.dto';
import { AppointmentStatus } from './appointments.enum';
import { MailService } from 'src/utils/mail.service';
import { PatientStatus, User } from '@prisma/client';
import { Role } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
    private mailService: MailService,
  ) {}

  // --- UPDATED METHOD: create(dto) ---

  async create(dto: CreateAppointmentDto) {
    this.logger.debug(`Attempting to create appointment for patientId: ${dto.patientId}`);
    try {
      const patient = await this.prisma.patient.findUnique({ where: { id: dto.patientId } });
      if (!patient) throw new NotFoundException('Patient not found');
      if (patient.status !== PatientStatus.ACTIVE)
        throw new BadRequestException('Patient is not active'); // Get the Doctor details if a doctorId is provided
      let doctor: User | null = null;
      if (dto.doctorId) {
        doctor = await this.prisma.user.findUnique({ where: { id: dto.doctorId } });
        if (!doctor) throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);
      }

      // Step 1: Perform all database operations within a transaction.
      const { appointment, frontdesks } = await this.prisma.$transaction(async (tx) => {
        const newAppointment = await tx.appointment.create({
          data: {
            patientId: dto.patientId, // required
            ...(dto.doctorId && { doctorId: dto.doctorId }), // optional
            ...(dto.maritalStatus && { maritalStatus: dto.maritalStatus }), // optional
            reason: dto.reason,
            service: dto.service,
            status: dto.status ?? AppointmentStatus.PENDING,
            timeslot: String(dto.timeSlot),
            date: new Date(dto.date),
          },
        });
        this.logger.log(`Successfully created appointment ${newAppointment.id} in transaction.`);

        // Also fetch any data needed for notifications within the same transaction.
        const frontdeskUsers = await tx.user.findMany({ where: { role: 'FRONTDESK' } });

        return { appointment: newAppointment, frontdesks: frontdeskUsers };
      });

      // Step 2: Send notifications *after* the transaction has committed.
      this.logger.log(
        `Transaction committed. Sending notifications for appointment ${appointment.id}...`,
      );
      const appointmentDate = new Date(dto.date);
      const dateStr = appointmentDate.toLocaleDateString();
      const timeStr = appointmentDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const appointmentDateTime = `${dateStr} at ${timeStr}`;

      // 1. Email to Patient
      this.mailService
        .sendAppointmentNotificationToPatient(
          patient.email,
          patient.firstName,
          patient.id,
          appointmentDateTime,
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send patient notification for appointment ${appointment.id}`,
            err.stack,
          ),
        );

      // 2. Email to Doctor
      if (doctor?.email) {
        this.mailService
          .sendAppointmentNotification(
            doctor.email,
            'New Appointment Scheduled For You Doc!',
            `Dear Dr. ${doctor.firstName} ${doctor.lastName},\n\nYou have a new appointment with ${patient.firstName} ${patient.lastName}. Scheduled for\n\nDate: ${dateStr}\nTime: ${timeStr}\nService: ${dto.service}\n${dto.reason ? `Reason: ${dto.reason}\n` : ''}\nPlease check your schedule for this PENDING appointment to approve.\n\nThank you!`,
          )
          .catch((err) =>
            this.logger.error(
              `Failed to send doctor notification for appointment ${appointment.id}`,
              err.stack,
            ),
          );
      }

      // 3. Email to Frontdesk/Admin
      for (const fd of frontdesks) {
        if (fd.email) {
          this.mailService
            .sendAppointmentNotificationToFrontdesk(
              fd.email,
              'Internal Appointment Creation Alert',
              `Staff member created an appointment for ${patient.firstName} ${patient.lastName} for ${dateStr} at ${timeStr}.`,
            )
            .catch((err) =>
              this.logger.error(
                `Failed to send frontdesk notification for appointment ${appointment.id}`,
                err.stack,
              ),
            );
        }
      }

      return appointment;
    } catch (err: any) {
      this.logger.error(`Failed to create appointment for patientId: ${dto.patientId}`, err.stack); // Re-throw the original exception if it's a known error
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Could not create appointment.');
    }
  }

  // --- EXISTING METHODS (publicBook, approve, cancel, complete, etc. remain as previously merged) ---

  async publicBook(dto: PublicBookAppointmentDto) {
    this.logger.debug(`Public booking attempt for email: ${dto.email}`);
    try {
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

      const appointmentDate = new Date(dto.date);
      const dateStr = appointmentDate.toLocaleDateString();
      const timeStr = appointmentDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const appointmentDateTime = `${dateStr} at ${timeStr}`;

      this.logger.debug(`Checking for existing patient with email: ${dto.email}`);
      const existingPatient = await this.prisma.patient.findUnique({
        where: { email: dto.email },
      });

      let patient;

      if (existingPatient) {
        this.logger.log(
          `Patient found with ID: ${existingPatient.id} and status: ${existingPatient.status}`,
        );
        if (existingPatient.status === PatientStatus.ACTIVE) {
          // if existing patient.status
          patient = existingPatient;
          const appointment = await this.prisma.appointment.create({
            data: {
              timeslot: dto.timeSlot,
              patientId: patient.id,
              date: appointmentDate,
              reason: dto.reason,
              status: AppointmentStatus.PENDING,
              service: dto.service,
            },
          });

          this.logger.log(
            `Sending appoin ment notification to existing active patient: ${patient.email}`,
          );
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
              // Combine date and the start of the timeSlot to create a valid DateTime for `timeslot`
              timeslot: dto.timeSlot,
              patientId: patient.id,
              date: appointmentDate,
              reason: dto.reason,
              status: AppointmentStatus.PENDING,
              service: dto.service,
            },
          });
          this.logger.log(`Sending pending approval update to patient: ${patient.email}`);
          return appointment;
        }
      }

      this.logger.log(
        `No existing patient found. Registering new patient with email: ${dto.email}`,
      );
      patient = await this.patientsService.selfRegister({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      });

      const appointment = await this.prisma.appointment.create({
        data: {
          timeslot: dto.timeSlot,
          patientId: patient.id,
          date: appointmentDate,
          reason: dto.reason,
          status: AppointmentStatus.PENDING,
          service: dto.service,
        },
      });
      this.logger.log(`New appointment ${appointment.id} created for new patient ${patient.id}`);

      this.logger.log(`Sending appointment notification to new patient: ${patient.email}`);
      this.mailService
        .sendAppointmentNotificationToPatient(
          patient.email,
          patient.firstName,
          appointmentDateTime,
          undefined, // No doctor name in this context
          patient.id,
        )
        .catch((err) =>
          this.logger.error(
            `Failed to send new patient notification for appointment ${appointment.id}`,
            err.stack,
          ),
        );

      this.logger.log('Sending notifications to frontdesk and doctor (if applicable).');
      // Use async/await for cleaner code instead of .then()
      const frontdesks = await this.prisma.user.findMany({ where: { role: 'FRONTDESK' } });
      for (const fd of frontdesks) {
        if (fd.email) {
          this.mailService
            .sendAppointmentNotificationToFrontdesk(
              fd.email,
              'New Appointment',
              `A new appointment has been booked by ${patient.firstName} ${patient.lastName} for ${dateStr} at ${timeStr}.`,
            )
            .catch((err) =>
              this.logger.error(
                `Failed to send frontdesk notification for new public booking ${appointment.id}`,
                err.stack,
              ),
            );
        }
      }

      return appointment;
    } catch (err: any) {
      this.logger.error(
        `Failed during public booking for email ${dto.email}: ${err.message}`,
        err.stack,
      );
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

  // --- MERGED LOGIC (updateStatus and Helpers) ---

  private async updateStatus(id: string, status: AppointmentStatus) {
    this.logger.debug(`Attempting to update status of appointment ${id} to ${status}`);
    try {
      if (!status) throw new BadRequestException('Status is required'); // MERGE: Include patient and doctor data for notifications
      const appt = await this.prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: true,
        },
      });

      if (!appt) throw new NotFoundException('Appointment not found');

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: { status: status as any },
      });

      this.logger.log(
        `Successfully updated status for appointment ${id} to ${status}. Sending notifications...`,
      ); // Data needed for emails
      const patientEmail = appt.patient.email;
      const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`;
      const doctorEmail = appt.doctor?.email;
      const doctorName = appt.doctor?.firstName; // Format date for email text
      const appointmentDateStr = appt.date.toLocaleDateString();
      const appointmentTimeStr = appt.date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const appointmentDateTime = `${appointmentDateStr} at ${appointmentTimeStr}`; // Distinct Email Logic for Patient, Doctor, and Admin

      if (status === AppointmentStatus.CONFIRMED) {
        // 1. Email to Patient: Appointment Confirmed (Friendly)
        await this.mailService.sendAppointmentNotificationToPatient(
          patientEmail,
          appt.patient.firstName, // Use first name for personalization
          appt.patientId, // Assuming this parameter is optional/misnamed, adjust if needed
          appointmentDateTime,
        ); // 2. Email to Doctor: Appointment Confirmed Notification (Internal Detail)
        if (doctorEmail) {
          await this.sendConfirmationToDoctor(
            doctorEmail,
            doctorName || '',
            patientName,
            appointmentDateTime,
            appt.service,
          );
        } // 3. Email to Frontdesk/Admin: Status Change Notification

        await this.sendAdminNotification(
          AppointmentStatus.CONFIRMED,
          patientName,
          appointmentDateTime,
        );
      } else if (status === AppointmentStatus.CANCELLED) {
        // 1. Email to Patient: Appointment Cancelled (Simple Alert)
        await this.mailService.sendAppointmentNotification(
          patientEmail,
          '🚫 Your Appointment Has Been Cancelled',
          `Dear ${appt.patient.firstName}, your appointment on ${appointmentDateTime} has been cancelled by the administration.`,
        ); // 2. Email to Doctor: Appointment Cancellation Notification (Internal Detail)

        if (doctorEmail) {
          await this.sendCancellationToDoctor(
            doctorEmail,
            doctorName || '',
            patientName,
            appointmentDateTime,
            appt.service,
          );
        } // 3. Email to Frontdesk/Admin: Status Change Notification

        await this.sendAdminNotification(
          AppointmentStatus.CANCELLED,
          patientName,
          appointmentDateTime,
        );
      }

      return updatedAppointment;
    } catch (err: any) {
      this.logger.error(`Failed to update status for appointment ${id}: ${err.message}`, err.stack);
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Could not update appointment status.');
    }
  } // --- EXISTING METHODS (UNCHANGED) ---

  //OLD UPDATE
  //   async updateAppointment(
  //     id: string,
  //     update: { status?: AppointmentStatus; date?: Date; reason?: string },
  //   ) {
  //     this.logger.debug(`Attempting to update appointment ${id}`);
  //     try {
  //       const appt = await this.prisma.appointment.findUnique({ where: { id } });
  //       if (!appt) throw new NotFoundException('Appointment not found');

  //  const updatedAppointment = await this.prisma.appointment.update({
  //         where: { id },
  //         data: {
  //           status: (update.status ?? appt.status) as any,
  //           date: update.date ?? appt.date,
  //           reason: update.reason ?? appt.reason,
  //         },
  //       });
  //       this.logger.log(`Successfully updated appointment ${id}`);
  //       return updatedAppointment;
  //     } catch (err: any) {
  //       this.logger.error(`Failed to update appointment ${id}: ${err.message}`, err.stack);
  //       if (err instanceof NotFoundException) throw err;
  //       throw new InternalServerErrorException('Could not update appointment.');
  //     }
  //   }

  //   async findAll(query: QueryAppointmentsDto) {
  //     this.logger.debug(`Finding all appointments with query: ${JSON.stringify(query)}`);
  //     try {
  //       const page = Math.max(query.page || 1, 1);
  //       const limit = Math.min(Math.max(query.limit || 20, 1), 100);
  //       const skip = (page - 1) * limit;

  //       const where: any = {};

  //       if (query.doctorId) {
  //         where.doctorId = query.doctorId;
  //       }
  //     if (query.patientId) {
  //       where.patientId = query.patientId;
  //     }

  //     if (query.status) {
  //       where.status = query.status;
  //     }
  //     if (query.q) {
  //       where.OR = [
  //         { reason: { contains: query.q, mode: 'insensitive' } },
  //         { service: { contains: query.q, mode: 'insensitive' } },
  //       ];
  //     }

  //     const [total, data] = await Promise.all([
  //       this.prisma.appointment.count({ where }), // Run count query
  //       this.prisma.appointment.findMany({
  //         where,
  //         skip,
  //         take: limit,
  //         orderBy: { date: 'desc' },
  //         include: {
  //           patient: true,
  //           doctor: {
  //             select: {
  //               id: true,
  //               firstName: true,
  //               lastName: true,
  //               email: true,
  //               specialization: true,
  //             },
  //           },
  //         },
  //       }),
  //     ]);

  //     this.logger.log(`Found ${data.length} of ${total} appointments.`);
  //     return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
  //   } catch (err: any) {
  //     this.logger.error(`Failed to find all appointments: ${err.message}`, err.stack);
  //     throw new InternalServerErrorException('Could not retrieve appointments.');
  //   }
  // }

  //NEW UPDATE
  async updateAppointment(id: string, update: UpdateAppointmentDto) {
    this.logger.debug(`Attempting to update appointment ${id}`);
    console.log('Received update DTO:', update); // <<< Add this line
    console.log('Received doctorId:', update.doctorId); // <<< Add this line
    try {
      // Fetch the existing appointment with related patient and current doctor for notification logic
      const appt = await this.prisma.appointment.findUnique({
        where: { id },
        include: { patient: true, doctor: true },
      });
      if (!appt) {
        this.logger.warn(`Appointment with ID ${id} not found for update.`);
        throw new NotFoundException('Appointment not found.');
      }

      let newDoctor: User | null = null;
      let assignmentChanged = false;

      // Prepare the data object for a true partial update
      const dataToUpdate: any = {};
      if (update.status !== undefined) dataToUpdate.status = update.status;
      if (update.date !== undefined) dataToUpdate.date = new Date(update.date);
      if (update.reason !== undefined) dataToUpdate.reason = update.reason;

      if (update.doctorId !== undefined) {
        // Check if the assignment is actually changing to trigger notifications later
        if (update.doctorId !== appt.doctorId) {
          assignmentChanged = true;
        }

        // If doctorId is not null, validate the user exists and has a valid role.
        if (update.doctorId !== null) {
          this.logger.debug(`Validating doctor ID ${update.doctorId} for appointment ${id}.`);
          newDoctor = await this.prisma.user.findFirst({
            where: {
              id: update.doctorId,
              role: { in: [Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPERADMIN] },
            },
          });

          if (!newDoctor) {
            this.logger.warn(
              `Assignable staff member with ID ${update.doctorId} not found or has an invalid role.`,
            );
            throw new NotFoundException(
              `Assignable staff member with ID ${update.doctorId} not found.`,
            );
          }
        } else {
          // If doctorId is explicitly set to null, it's an unassignment.
          this.logger.debug(`Unassigning doctor from appointment ${id}`);
          newDoctor = null; // Ensure newDoctor is null for notification logic
        }

        // Add the doctorId (either a UUID or null) to the data to be updated.
        dataToUpdate.doctorId = update.doctorId;
      }
      // ----------------------------------------------------

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: dataToUpdate, // Use the dynamically built dataToUpdate object
        include: { patient: true, doctor: true }, // Include relations for the response and notification logic
      });

      this.logger.log(`Successfully updated appointment ${id}.`);

      // --- Notification Logic for Doctor Assignment ---
      // Only send this notification if a doctor was newly assigned or changed
      if (assignmentChanged && newDoctor) {
        // newDoctor will be null if unassigned
        const appointmentDateStr = updatedAppointment.date.toLocaleDateString();
        const appointmentTimeStr = updatedAppointment.date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const appointmentDateTime = `${appointmentDateStr} at ${appointmentTimeStr}`;
        const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`; // Use original patient name

        // Send a dedicated notification to the NEWLY assigned doctor
        // Only send if a doctor was actually assigned (not unassigned)
        if (newDoctor.email) {
          this.sendNewAssignmentNotificationToDoctor(
            newDoctor.email,
            newDoctor.firstName,
            patientName,
            appointmentDateTime,
            updatedAppointment.service || 'N/A', // Provide service, or 'N/A' if it can be null
          ).catch((err) =>
            this.logger.error(
              `Failed to send assignment notification to Dr. ${newDoctor.id} for appointment ${id}`,
              err.stack,
            ),
          );
        }
      }
      // ----------------------------------------------------

      return updatedAppointment;
    } catch (err: any) {
      this.logger.error(`Failed to update appointment ${id}: ${err.message}`, err.stack);
      // Re-throw specific exceptions for proper client-side handling
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('Could not update appointment.');
    }
  }

  private async sendNewAssignmentNotificationToDoctor(
    doctorEmail: string,
    doctorName: string | null | undefined,
    patientName: string,
    appointmentDate: string, // formatted date/time string
    service: string,
  ) {
    const subject = '🔔 NEW APPOINTMENT ASSIGNED: Staff Action';
    const html = `
        <h3>New Patient Assigned</h3>
        <p>Dear Dr. ${doctorName ?? ''},</p>
        <p>A staff member has **assigned** the following appointment to your schedule:</p>
        <ul>
            <li>**Patient:** ${patientName}</li>
            <li>**Date/Time:** ${appointmentDate}</li>
            <li>**Service:** ${service}</li>
        </ul>
        <p>Please review the details on your dashboard.</p>
    `;

    await this.mailService.sendMail(doctorEmail, subject, html);
  }
  async findOne(id: string, projection?: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true, // Return all patient scalar fields
        doctor: {
          // Select specific fields for doctor
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
      this.logger.error(
        `Failed to find appointments for user ${userId}: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Could not retrieve your appointments.');
    }
  } /**
   * Sends a detailed confirmation to the specific doctor.
   */

  // --- PRIVATE HELPER METHODS FOR DISTINCT DOCTOR/ADMIN EMAILS (Unchanged from previous merge) ---

  private async sendConfirmationToDoctor(
    doctorEmail: string,
    doctorName: string | undefined,
    patientName: string,
    appointmentDate: string, // formatted date/time string
    service: string,
  ) {
    const subject = '✅ APPOINTMENT CONFIRMED: Ready for Patient Visit';
    const html = `
          <h3>Appointment Confirmed</h3>
          <p>Dear Dr. ${doctorName ?? ''},</p>
          <p>The appointment with patient <strong>${patientName}</strong> on <strong>${appointmentDate}</strong> 
          for service **${service}** has been **CONFIRMED** and finalized.</p>
          <p>Please review the patient's record on your dashboard before the visit.</p>
      `; // Assumes generic sendMail method from MailService
    await this.mailService.sendMail(doctorEmail, subject, html);
  } /**
   * Sends a detailed cancellation notice to the specific doctor.
   */
  private async sendCancellationToDoctor(
    doctorEmail: string,
    doctorName: string | undefined,
    patientName: string,
    appointmentDate: string, // formatted date/time string
    service: string,
  ) {
    const subject = '🚫 APPOINTMENT CANCELLED: Slot Now Open';
    const html = `
          <h3>Appointment Cancelled</h3>
          <p>Dear Dr. ${doctorName ?? ''},</p>
          <p style="color: red;">The appointment with patient <strong>${patientName}</strong> on <strong>${appointmentDate}</strong> 
          for service **${service}** has been **CANCELLED**.</p>
          <p>The time slot is now available on your schedule for a new booking.</p>
      `; // Assumes generic sendMail method from MailService
    await this.mailService.sendMail(doctorEmail, subject, html);
  } /**
   * Sends a generic notification to all frontdesk users about a status change.
   */

  private async sendAdminNotification(
    status: AppointmentStatus,
    patientName: string,
    appointmentDateTime: string,
  ) {
    const action = status === AppointmentStatus.CONFIRMED ? 'CONFIRMED' : 'CANCELLED';
    const subject = `🚨 ADMIN ALERT: Appointment ${action}`;
    const message = `Appointment for **${patientName}** on **${appointmentDateTime}** has been **${action}**. Action required for documentation/billing.`;

    this.prisma.user.findMany({ where: { role: 'FRONTDESK' } }).then((frontdesks) => {
      frontdesks.forEach((fd) => {
        if (fd.email) {
          // Using a dedicated MailService method or the generic one
          this.mailService.sendAppointmentNotificationToFrontdesk(fd.email, subject, message);
        }
      });
    });
  }
}
