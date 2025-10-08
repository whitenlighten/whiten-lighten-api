import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // 🧾 STAFF CLOCK IN/OUT
  async staffClock(dto: { staffId: string; action: 'IN' | 'OUT' }) {
    try {
      const staff = await this.prisma.user.findUnique({ where: { id: dto.staffId } });
      if (!staff) throw new NotFoundException('Staff not found');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's attendance
      const existing = await this.prisma.staffAttendance.findFirst({
        where: { staffId: dto.staffId, clockIn: { gte: todayStart } },
        orderBy: { clockIn: 'desc' },
      });

      if (dto.action === 'IN') {
        if (existing && !existing.clockOut)
          throw new BadRequestException('Staff already clocked in');
        return await this.prisma.staffAttendance.create({
          data: { staffId: dto.staffId },
        });
      }

      if (dto.action === 'OUT') {
        if (!existing) throw new BadRequestException('No clock-in found for today');
        if (existing.clockOut) throw new BadRequestException('Already clocked out');
        return await this.prisma.staffAttendance.update({
          where: { id: existing.id },
          data: { clockOut: new Date() },
        });
      }

      throw new BadRequestException('Invalid action');
    } catch (err) {
      console.error('❌ Staff clock error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException)
        throw err;
      throw new InternalServerErrorException('Failed to process staff attendance');
    }
  }

  // 🧾 CLIENT ATTENDANCE (for appointments)
  async clientAttendance(appointmentId: string, status: 'ATTENDED' | 'NO_SHOW') {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!appointment) throw new NotFoundException('Appointment not found');

      return await this.prisma.clientAttendance.upsert({
        where: { id : appointmentId },
        update: { status },
        create  : { appointmentId, status, attended: status === 'ATTENDED' },
      });
    } catch (err) {
      console.error('❌ Client attendance error:', err);
      if (err instanceof BadRequestException || err instanceof NotFoundException)
        throw err;
      throw new InternalServerErrorException('Failed to record client attendance');
    }
  }

  async getStaffAttendance(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const [total, records] = await this.prisma.$transaction([
        this.prisma.staffAttendance.count(), // Corrected: Access staffAttendance property
        this.prisma.staffAttendance.findMany({
          skip,
          take: limit,
          include: {
            staff: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { clockIn: 'desc' },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data: records,
      };
    } catch (err) {
      console.error('❌ Get staff attendance failed:', err);
      throw new InternalServerErrorException('Unable to fetch staff attendance');
    }
  }


  async getClientAttendance(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const [total, records] = await this.prisma.$transaction([
        this.prisma.clientAttendance.count(),
        this.prisma.clientAttendance.findMany({
          skip,
          take: limit,
          include: {
            appointment: {
              include: {
                patient: {
                  select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data: records,
      };
    } catch (err) {
      console.error('❌ Get client attendance failed:', err);
      throw new InternalServerErrorException('Unable to fetch client attendance');
    }
  }
}
