import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateNotificationDto, QueryNotificationDto, } from './notifications.dto';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto) {
    this.logger.debug(`Creating notification for recipientId: ${dto.recipientId}`);
    try {
      const recipient = await this.prisma.patient.findUnique({
        where: { id: dto.recipientId },
      });
      if (!recipient) throw new NotFoundException('Recipient not found');

      const notification = await this.prisma.notification.create({
        data: {
          recipientId: dto.recipientId,
          title: dto.title,
          message: dto.message,
          type: dto.type || 'SYSTEM', // Provide a default value
        },
      });

      // Log to Audit Trail
      await this.prisma.auditTrail.create({
        data: {
          action: 'CREATE_NOTIFICATION',
          details: `Notification sent to ${recipient.firstName} ${recipient.lastName}: ${dto.title}`,
          actorId: 'SYSTEM', // System action
          actorRole: 'SYSTEM',
          entityType: 'Notification',
          entityId: notification.id,
        },
      });

      return notification;
    } catch (err: any) {
      this.logger.error(`Failed to create notification: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Could not create notification');
    }
  }

  /**
   * Get notifications for a specific patient (paginated)
   */
  async findAllForPatient(patientId: string, query: QueryNotificationDto) {
    try {
      const page = Math.max(Number(query.page) || 1, 1);
      const limit = Math.min(Number(query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = { recipientId: patientId };
      if (query.type) where.type = query.type;
      if (query.read !== undefined) where.read = query.read;

      const [total, data] = await this.prisma.$transaction([
        this.prisma.notification.count({ where }),
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err: any) {
      this.logger.error(`Failed to fetch notifications for ${patientId}: ${err.message}`);
      throw new InternalServerErrorException('Could not fetch notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, user: any) {
    try {
      const notification = await this.prisma.notification.findUnique({ where: { id } });
      if (!notification) throw new NotFoundException('Notification not found');

      if (user.role === Role.PATIENT && notification.recipientId !== user.patientId) {
        throw new ForbiddenException('You can only update your own notifications');
      }

      return this.prisma.notification.update({
        where: { id },
        data: { read: true },
      });
    } catch (err: any) {
      this.logger.error(`Error marking notification ${id} as read: ${err.message}`);
      throw new InternalServerErrorException('Could not update notification');
    }
  }

  /**
   * Delete notification (Admin/SuperAdmin only)
   */
  async delete(id: string, user: any) {
    try {
      if (![Role.SUPERADMIN, Role.ADMIN].includes(user.role)) {
        throw new ForbiddenException('You do not have permission to delete notifications');
      }

      const existing = await this.prisma.notification.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Notification not found');

      await this.prisma.notification.delete({ where: { id } });

      await this.prisma.auditTrail.create({
        data: {
          action: 'DELETE_NOTIFICATION',
          actorId: user.id,
          actorRole: user.role,
          details: `Notification "${existing.title}" deleted by ${user.role}`,
          entityType: 'Notification',
          entityId: existing.id,
        },
      });

      return { message: 'Notification deleted successfully' };
    } catch (err: any) {
      this.logger.error(`Failed to delete notification ${id}: ${err.message}`);
      throw new InternalServerErrorException('Could not delete notification');
    }
  }

  /**
   * Admin view of all notifications
   */
  async findAllForAdmin(query: QueryNotificationDto, user: any) {
    if (![Role.SUPERADMIN, Role.ADMIN].includes(user.role)) {
      throw new ForbiddenException('You do not have permission to view all notifications');
    }

    try {
      const page = Math.max(Number(query.page) || 1, 1);
      const limit = Math.min(Number(query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.type) where.type = query.type;
      if (query.read !== undefined) where.read = query.read;

      const [total, data] = await this.prisma.$transaction([
        this.prisma.notification.count({ where }),
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { recipient: true },
        }),
      ]);

      return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
    } catch (err: any) {
      this.logger.error(`Failed to fetch notifications: ${err.message}`);
      throw new InternalServerErrorException('Could not fetch notifications');
    }
  }
}
