 import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuditTrailService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, entityType: string, entityId: string, actor: any, details?: any, ip?: string) {
    try {
      if (!action || !entityType) throw new BadRequestException('Invalid audit log parameters');

      return await this.prisma.auditTrail.create({
        data: {
          action,
          entityType,
          entityId,
          actorId: actor?.id || null,
          actorRole: actor?.role || 'SYSTEM',
          details: details ? JSON.stringify(details) : null,
          ipAddress: ip || null,
        },
      });
    } catch (error) {
      console.error('❌ Audit trail error:', error);
      throw new InternalServerErrorException('Failed to log audit trail');
    }
  }

  async findAll(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const [total, data] = await this.prisma.$transaction([
        this.prisma.auditTrail.count(),
        this.prisma.auditTrail.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        data,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch audit logs');
    }
  }

  async findByActor(actorId: string) {
    try {
      return this.prisma.auditTrail.findMany({
        where: { actorId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch user audit logs');
    }
  }
}
