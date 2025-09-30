// src/modules/users/users.service.ts
import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { MailService } from 'src/utils/mail.service';
import { ChangeRoleDto, CreateUserDto, QueryUsersDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Create user with strict role rules (callerRole is from the authenticated user)
  async create(dto: CreateUserDto, callerId: string, callerRole: Role) {
    if (dto.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Cannot create SUPERADMIN via API');
    }

    if (!['SUPERADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'FRONTDESK'].includes(callerRole)) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can create ADMIN role');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new BadRequestException('Email or phone already in use');
    }

   
    const rawPassword = dto.password; // keep this safe for email
    const hashed = await bcrypt.hash(rawPassword, 12);


    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'CREATE_USER',
        resource: 'User',
        resourceId: user.id,
        changes: { created: { email: user.email, role: user.role } },
      },
    });

    // --- Fixed error handling ---
    try {
      await this.mailService.sendWelcomeEmail(
         user.email,
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
         user.role,
         rawPassword,   // send plain passw
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.warn(`Welcome email failed for ${user.email}`, errorMessage);

      await this.prisma.auditLog.create({
        data: {
          userId: callerId,
          action: 'EMAIL_FAIL',
          resource: 'User',
          resourceId: user.id,
          changes: {
            reason: 'welcome_email_failed',
            error: errorMessage,
          },
        },
      });
    }

    const { password, ...rest } = user as any;
    return rest;
  }

  async findAll(query: QueryUsersDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      // Exclude users with the PATIENT role
      role: {
        not: Role.PATIENT,
      },
    };

    if (query.role) where.role = query.role;
    if (query.q) {
      // Combine search with the role exclusion
      where.AND = [
        { role: { not: Role.PATIENT } },
        { OR: [
        { email: { contains: query.q, mode: 'insensitive' } },
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
      ]}];
    }

    let selectedFields: Record<string, boolean> = { id: true };
    if (query.fields) {
      query.fields.split(',').map(f => f.trim()).forEach(field => {
        if (field) selectedFields[field] = true;
      });
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: selectedFields }),
    ]);

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, callerId: string, callerRole: Role) {
    if (callerId !== id && !['SUPERADMIN', 'ADMIN'].includes(callerRole)) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: id,
        changes: dto as any,
      },
    });

    return updated;
  }

  async changeRole(targetUserId: string, dto: ChangeRoleDto, callerId: string, callerRole: Role) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Target user not found');

    if (dto.role === Role.SUPERADMIN) throw new ForbiddenException('Cannot assign SUPERADMIN role');
    if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) throw new ForbiddenException('Only SUPERADMIN can assign ADMIN role');
    if (callerRole === Role.ADMIN && ['ADMIN','SUPERADMIN'].includes(dto.role)) throw new ForbiddenException('Admin cannot assign ADMIN or SUPERADMIN roles');
    if (target.role === Role.SUPERADMIN && callerRole !== Role.SUPERADMIN) throw new ForbiddenException('Cannot change role of SUPERADMIN');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'CHANGE_ROLE',
        resource: 'User',
        resourceId: targetUserId,
        changes: { previous: target.role, next: dto.role },
      },
    });

    return updated;
  }

  async softDelete(id: string, callerId: string, callerRole: Role) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (!['SUPERADMIN', 'ADMIN'].includes(callerRole)) throw new ForbiddenException('Insufficient permissions to deactivate user');
    if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) throw new ForbiddenException('Only SUPERADMIN can deactivate ADMIN users');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'DEACTIVATE_USER', resource: 'User', resourceId: id, changes: { previousActive: target.isActive, newActive: false } },
    });

    return updated;
  }

  async activate(id: string, callerId: string, callerRole: Role) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (!['SUPERADMIN', 'ADMIN'].includes(callerRole)) throw new ForbiddenException('Insufficient permissions to activate user');
    if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) throw new ForbiddenException('Only SUPERADMIN can activate ADMIN users');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: { userId: callerId, action: 'ACTIVATE_USER', resource: 'User', resourceId: id, changes: { previousActive: target.isActive, newActive: true } },
    });

    return updated;
  }
}
