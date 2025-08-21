import { 
  Injectable, 
  BadRequestException, 
  NotFoundException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';

import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';   // ✅ fixed uuid import

import { patientSelect } from './patient.select';
import { ok } from 'src/utils/response';
import { AuditLogger } from 'prisma/middleware/auditlogger';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient..dto';

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

  // -------------------- EMAIL TEMPLATE --------------------
  async sendPreRegEmail(to: string, code: string) {
    const html = `<!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8" /><title>Pre-Registration Code</title></head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px; background-color:#f4f7fa;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" 
                     style="background-color:#ffffff; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background-color:#0077b6; padding:20px; text-align:center; color:#ffffff; font-size:24px; font-weight:bold;">
                    CelebDent
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px; color:#333333; font-size:16px; line-height:1.6;">
                    <p>Hello,</p>
                    <p>Thank you for pre-registering with <strong>CelebDent</strong>!  
                       Your unique pre-registration code is:</p>
                    <div style="text-align:center; margin:30px 0;">
                      <span style="display:inline-block; padding:15px 30px; font-size:20px; font-weight:bold; color:#ffffff; background-color:#0077b6; border-radius:6px;">
                        ${code}
                      </span>
                    </div>
                    <p>Please keep this code safe — you will need it to complete your registration.</p>
                    <p>Best regards,<br/><strong>The CelebDent Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666666;">
                    &copy; ${new Date().getFullYear()} CelebDent. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    try {
      await this.transporter.sendMail({
        from: '"CelebDent" <noreply@celebdent.com>',
        to,
        subject: 'Your CelebDent Pre-Registration Code',
        text: `Thank you for pre-registering! Your code is: ${code}`,
        html,
      });
    } catch (err) {
      console.error('Email send failed:', err.message);
      throw new InternalServerErrorException('Failed to send pre-registration email');
    }
  }

  // -------------------- CREATE PRE-REGISTRATION --------------------
  async createPreRegistration(dto: CreatePatientDto) {
    try {
      if (!dto.email) {
        throw new BadRequestException('Email is required for pre-registration');
      }

      const preRegCode = 'Client-' + uuidv4(); // ✅ now works properly

      const preReg = await this.prisma.preRegistration.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          dateOfBirth: new Date(dto.dateOfBirth),
          address: dto.address ?? null,
          preRegCode,
        },
      });

      await this.sendPreRegEmail(preReg.email, preReg.preRegCode);

      return ok('Pre-registration created successfully - code sent to email', preReg);
    } catch (error) {
      console.error('createPreRegistration error:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error creating pre-registration');
    }
  }

  // -------------------- PROMOTE TO PATIENT --------------------
  async promotePreRegistration(preRegId: string) {
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
          gender: 'OTHER', // ✅ placeholder
          address: preReg.address ?? '',
          preRegistrationId: preReg.id,
        },
        select: patientSelect,
      });

      return ok('Pre-registration promoted to patient successfully', patient);
    } catch (error) {
      console.error('promotePreRegistration error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error promoting pre-registration');
    }
  }

  // -------------------- CREATE PATIENT --------------------
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
          emergencyContact: dto.emergencyContact ?? null,
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

      await Promise.all(
        admins.map(admin =>
          this.transporter.sendMail({
            to: admin.email,
            subject: 'New Patient Registered',
            text: `A new patient (${patient.firstName} ${patient.lastName}) has registered.`,
          }),
        ),
      );

      return ok('Patient created successfully', patient);
    } catch (error) {
      console.error('createPatient error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error creating patient');
    }
  }

    // -------------------- GET PATIENT BY ID --------------------
  async getPatientById(id: string) {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id, deletedAt: null },
        select: patientSelect,
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      return ok('Patient fetched successfully', patient);
    } catch (error) {
      console.error('getPatientById error:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching patient');
    }
  }


    // -------------------- GET ALL PATIENTS WITH PAGINATION --------------------
  async getAllPatients(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [patients, total] = await this.prisma.$transaction([
        this.prisma.patient.findMany({
          where: { deletedAt: null },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: patientSelect,
        }),
        this.prisma.patient.count({ where: { deletedAt: null } }),
      ]);

      return ok('Patients fetched successfully', {
        data: patients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('getAllPatients error:', error);
      throw new InternalServerErrorException('Error fetching patients');
    }
  }

  // -------------------- UPDATE PATIENT --------------------
  async updatePatient(id: string, data: UpdatePatientDto) {
    try {
      const oldPatient = await this.prisma.patient.findUnique({ where: { id, deletedAt: null } });
      if (!oldPatient) throw new NotFoundException('Patient not found');

      const updatedPatient = await this.prisma.patient.update({
        where: { id },
        data,
        select: patientSelect,
      });

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

  // -------------------- DELETE PATIENT --------------------
  async deletePatient(id: string) {
    try {
      const oldPatient = await this.prisma.patient.findUnique({ where: { id, deletedAt: null } });
      if (!oldPatient) throw new NotFoundException('Patient not found');

      await this.prisma.patient.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

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
}
