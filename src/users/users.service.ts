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
    // Prevent creation of SUPERADMIN through this endpoint
    if (dto.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Cannot create SUPERADMIN via API');
    }

    // If caller is not SUPERADMIN or ADMIN -> forbidden
    if (
      !['SUPERADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'FRONTDESK'].includes(
        callerRole,
      )
    ) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    // Check rules:
    // - Only SUPERADMIN can create ADMIN
    if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can create ADMIN role');
    }

    // Admin can create DOCTOR, NURSE, FRONTDESK (not ADMIN or SUPERADMIN)
    // SUPERADMIN can create any except SUPERADMIN
    // Unique email/phone check
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new BadRequestException('Email or phone already in use');
    }

    // Hash password
    const hashed = await bcrypt.hash(dto.password, 12);

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

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'CREATE_USER',
        resource: 'User',
        resourceId: user.id,
        changes: { created: { email: user.email, role: user.role } },
      },
    });

    // Send welcome email (non-blocking)
    try {
      await this.mailService.sendWelcomeEmail(
        user.email,
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        user.role,
        undefined,
      );
    } catch (err) {
      this.logger.warn(
        `Welcome email failed for ${user.email}`,
        err?.message ?? err,
      );
      // Optionally store audit log about email failure
      await this.prisma.auditLog.create({
        data: {
          userId: callerId,
          action: 'EMAIL_FAIL',
          resource: 'User',
          resourceId: user.id,
          changes: {
            reason: 'welcome_email_failed',
            error: String(err?.message ?? err),
          },
        },
      });
    }

    const { password, ...rest } = user as any;
    return rest;
  }

  // List users with filters and pagination
  async findAll(query: QueryUsersDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // -------- Handle fields projection --------
    let selectedFields: Record<string, boolean> = { id: true }; // always include id
    if (query.fields) {
      const fields = query.fields.split(',').map((f) => f.trim());
      fields.forEach((field) => {
        if (field.length > 0) {
          selectedFields[field] = true;
        }
      });
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: selectedFields,
      }),
    ]);

    return {
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data,
    };
  }

  // Get single user (public fields)
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Update user - self or admin/superadmin
  async update(
    id: string,
    dto: UpdateUserDto,
    callerId: string,
    callerRole: Role,
  ) {
    // If caller is not the user and not admin/superadmin -> forbidden
    if (callerId !== id && !['SUPERADMIN', 'ADMIN'].includes(callerRole)) {
      throw new ForbiddenException(
        'Insufficient permissions to update this user',
      );
    }

    // If trying to change protected fields (role, password) -> disallow here
    // Role changes should go through changeRole()
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
      },
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

  // Change role with strict rules
  async changeRole(
    targetUserId: string,
    dto: ChangeRoleDto,
    callerId: string,
    callerRole: Role,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('Target user not found');

    // No one can create SUPERADMIN (except seed), and role change to SUPERADMIN is forbidden
    if (dto.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Cannot assign SUPERADMIN role');
    }

    // Only SUPERADMIN can assign ADMIN
    if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can assign ADMIN role');
    }

    // ADMIN cannot assign ADMIN or SUPERADMIN
    if (
      callerRole === Role.ADMIN &&
      ['ADMIN', 'SUPERADMIN'].includes(dto.role)
    ) {
      throw new ForbiddenException(
        'Admin cannot assign ADMIN or SUPERADMIN roles',
      );
    }

    // Prevent downgrading a SUPERADMIN user (if somehow exists)
    if (target.role === Role.SUPERADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Cannot change role of SUPERADMIN');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
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

  // Soft delete (deactivate)
  async softDelete(id: string, callerId: string, callerRole: Role) {
    // Only admin/superadmin can deactivate; only superadmin can deactivate admins
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    if (!['SUPERADMIN', 'ADMIN'].includes(callerRole)) {
      throw new ForbiddenException(
        'Insufficient permissions to deactivate user',
      );
    }

    if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException(
        'Only SUPERADMIN can deactivate ADMIN users',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'DEACTIVATE_USER',
        resource: 'User',
        resourceId: id,
        changes: { previousActive: target.isActive, newActive: false },
      },
    });

    return updated;
  }

  // Activate user (reactivate)
  async activate(id: string, callerId: string, callerRole: Role) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    if (!['SUPERADMIN', 'ADMIN'].includes(callerRole)) {
      throw new ForbiddenException('Insufficient permissions to activate user');
    }

    if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can activate ADMIN users');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: callerId,
        action: 'ACTIVATE_USER',
        resource: 'User',
        resourceId: id,
        changes: { previousActive: target.isActive, newActive: true },
      },
    });

    return updated;
  }
}
