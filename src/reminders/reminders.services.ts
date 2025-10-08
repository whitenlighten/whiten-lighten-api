import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/utils/mail.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateReminderDto } from './reminders.dto';

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // 🕒 Run every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReminderCron() {
    try {
      await this.processReminders();
    } catch (error) {
      if (error instanceof Error) {
        console.error('⚠️ Cron job failed:', error.message);
      }
      throw new HttpException('Reminder cron execution failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 📨 Create new reminder
  async create(id: string, dto: CreateReminderDto) {
    try {

      const user = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
      if (!dto.email || !dto.message || !dto.scheduledAt) {
        throw new BadRequestException('Email, message, and scheduledAt are required.');
      }

      const reminder = await this.prisma.reminder.create({

        data: {
          id: id,
          email: dto.email,
          subject: dto.subject,
          message: dto.message,
          scheduledAt: new Date(dto.scheduledAt),
        },
      });

      return {
        success: true,
        message: 'Reminder created successfully.',
        data: reminder,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error creating reminder:', error.message);
      }
      if (error instanceof BadRequestException) throw error;
      throw new HttpException('Failed to create reminder.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 🔍 Get all reminders
  async findAll(page: number = 1, limit: number = 10) {
  try {
    // Ensure page and limit are positive integers
    const p = Math.max(1, Math.floor(page));
    const l = Math.max(1, Math.floor(limit));

    // Calculate skip based on page and limit
    const skip = (p - 1) * l;

    // 1. Get the total count of reminders
    const totalCount = await this.prisma.reminder.count();

    if (totalCount === 0) {
      throw new NotFoundException('No reminders found.');
    }

    // 2. Fetch the paginated reminders
    const reminders = await this.prisma.reminder.findMany({
      orderBy: { scheduledAt: 'asc' },
      skip: skip, // How many records to skip (offset)
      take: l,    // How many records to take (limit)
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / l);

    // If the requested page is beyond the total pages, it might be an issue
    // but the current implementation handles it gracefully by returning an empty array
    // if skip > totalCount, or by returning the last partial page.

    // 3. Return the paginated response
    return {
      success: true,
      page: p,
      limit: l,
      totalPages: totalPages,
      totalCount: totalCount, // Total number of all reminders
      data: reminders,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error fetching reminders:', error.message);
    }
    if (error instanceof NotFoundException) throw error;
    throw new HttpException(
      'Failed to fetch reminders.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  // 🔔 Process pending reminders automatically
  async processReminders() {
    try {
      const dueReminders = await this.prisma.reminder.findMany({
        where: { sent: false, scheduledAt: { lte: new Date() } },
      });

      if (!dueReminders.length) return;

      for (const reminder of dueReminders) {
        try {
          await this.mailService.sendMail(
            reminder.email,
            reminder.subject || 'Reminder Notification',
            reminder.message,
          );

          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { sent: true },
          });

          console.log(`✅ Reminder sent to ${reminder.email}`);
        } catch (mailError) {
          if (mailError instanceof Error) {
            console.error(`❌ Failed to send reminder to ${reminder.email}:`, mailError.message);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error processing reminders:', error.message);
      }
      throw new HttpException('Failed to process reminders.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
