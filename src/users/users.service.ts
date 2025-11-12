// src/modules/users/users.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException, // ⬅️ Added for consistency
  Logger,
  RequestTimeoutException,
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

  // ----------------------------------------------------------------------
  // 1. CREATE
  // ----------------------------------------------------------------------
  async create(dto: CreateUserDto, callerId: string, callerRole: Role) {
    // --- Validation/Authorization Checks (Preserved) ---
    if (dto.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Cannot create SUPERADMIN via API');
    }
    if (!['SUPERADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'FRONTDESK'].includes(callerRole)) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }
    if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only SUPERADMIN can create ADMIN role');
    }

    const TIMEOUT_MS = 10000;

    const createPromise = (async () => {
      const existing = await this.prisma.user.findFirst({
        where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
      });
      if (existing) {
        throw new BadRequestException('Email or phone already in use');
      }

      const rawPassword = dto.password;
      const hashed = await bcrypt.hash(rawPassword, 10);

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

      this.mailService
        .sendWelcomeEmail(
          user.email,
          `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          user.role,
          rawPassword,
        )
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Welcome email failed for ${user.email}. Error: ${errorMessage}`);
          this.prisma.auditLog
            .create({
              data: {
                userId: callerId,
                action: 'EMAIL_FAIL',
                resource: 'User',
                resourceId: user.id,
                changes: { reason: 'welcome_email_failed', error: errorMessage },
              },
            })
            .catch((e) => this.logger.warn('Audit log failed: ' + e.message));
        });

      const { password, ...rest } = user;
      return rest;
    })();
    try {
      return await Promise.race([
        createPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new RequestTimeoutException('Request timed out')), TIMEOUT_MS),
        ),
      ]);
    } catch (err: any) {
      if (err instanceof RequestTimeoutException) {
        this.logger.error(`❌ User creation timed out after ${TIMEOUT_MS / 1000}s`);
        throw new RequestTimeoutException('User creation took too long, please try again later.');
      }
      this.logger.error(`Failed to create user by caller ${callerId}`, err.stack);
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  // ----------------------------------------------------------------------
  // 2. FIND ALL
  // ----------------------------------------------------------------------
  async findAll(query: QueryUsersDto, callerRole: Role, callerId: string) {
    try {
      const page = parseInt(query.page || '1', 10);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const skip = (page - 1) * limit;

      const conditions: any[] = [{ role: { not: Role.PATIENT } }];

      if (query.role) {
        conditions.push({ role: query.role });
      }

      if (query.q) {
        conditions.push({
          OR: [
            { email: { contains: query.q, mode: 'insensitive' } },
            { firstName: { contains: query.q, mode: 'insensitive' } },
            { lastName: { contains: query.q, mode: 'insensitive' } },
          ],
        });
      }

      if (callerRole === Role.FRONTDESK) {
        // Frontdesk can only see doctors
        conditions.push({ role: Role.DOCTOR });
      } else if (callerRole === Role.DOCTOR) {
        // Doctors can only see themselves (if you ever expose user list to them)
        conditions.push({ id: callerId });
      } else if (![Role.ADMIN, Role.SUPERADMIN, Role.NURSE].includes(callerRole as any)) {
        throw new ForbiddenException('Insufficient permissions to list users');
      }

      let selectedFields: Record<string, boolean> = { id: true };
      if (query.fields) {
        query.fields
          .split(',')
          .map((f) => f.trim())
          .forEach((field) => {
            if (field) selectedFields[field] = true;
          });
      }

      const where = { AND: conditions };

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
    } catch (err: any) {
      this.logger.error(`Failed to list users with query ${JSON.stringify(query)}`, err.stack);
      if (err instanceof BadRequestException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to retrieve user list');
    }
  }

  // ----------------------------------------------------------------------
  // 3. FIND ONE
  // ----------------------------------------------------------------------
  async findOne(id: string) {
    try {
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
          password: true,
        },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (err: any) {
      this.logger.error(`Failed to find user ID ${id}`, err.stack);
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to retrieve user details');
    }
  }

  // ----------------------------------------------------------------------
  // 4. UPDATE
  // ----------------------------------------------------------------------
  async update(id: string, dto: UpdateUserDto, callerId: string, callerRole: Role) {
    // --- Authorization Checks (Preserved) ---
    if (callerId !== id && !['SUPERADMIN', 'ADMIN'].includes(callerRole)) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    try {
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
    } catch (err: any) {
      this.logger.error(`Failed to update user ID ${id} by caller ${callerId}`, err.stack);
      if (err.code === 'P2025') {
        // Prisma error for record not found on update
        throw new NotFoundException('User not found');
      }
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  // ----------------------------------------------------------------------
  // 5. CHANGE ROLE
  // ----------------------------------------------------------------------
  async changeRole(targetUserId: string, dto: ChangeRoleDto, callerId: string, callerRole: Role) {
    try {
      const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target) throw new NotFoundException('Target user not found');

      // --- Authorization/Business Logic Checks (Preserved) ---
      if (dto.role === Role.SUPERADMIN)
        throw new ForbiddenException('Cannot assign SUPERADMIN role');
      if (dto.role === Role.ADMIN && callerRole !== Role.SUPERADMIN)
        throw new ForbiddenException('Only SUPERADMIN can assign ADMIN role');
      if (callerRole === Role.ADMIN && ['ADMIN', 'SUPERADMIN'].includes(dto.role))
        throw new ForbiddenException('Admin cannot assign ADMIN or SUPERADMIN roles');
      if (target.role === Role.SUPERADMIN && callerRole !== Role.SUPERADMIN)
        throw new ForbiddenException('Cannot change role of SUPERADMIN');

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
    } catch (err: any) {
      this.logger.error(
        `Failed to change role for user ${targetUserId} by caller ${callerId}`,
        err.stack,
      );
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to change user role');
    }
  }

  // ----------------------------------------------------------------------
  // 6. SOFT DELETE (Deactivate)
  // ----------------------------------------------------------------------
  async softDelete(id: string, callerId: string, callerRole: Role) {
    try {
      const target = await this.prisma.user.findUnique({ where: { id } });
      if (!target) throw new NotFoundException('User not found');

      // --- Authorization/Business Logic Checks (Preserved) ---
      if (!['SUPERADMIN', 'ADMIN'].includes(callerRole))
        throw new ForbiddenException('Insufficient permissions to deactivate user');
      if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN)
        throw new ForbiddenException('Only SUPERADMIN can deactivate ADMIN users');

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
    } catch (err: any) {
      this.logger.error(`Failed to deactivate user ID ${id} by caller ${callerId}`, err.stack);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to deactivate user');
    }
  }

  // ----------------------------------------------------------------------
  // 7. ACTIVATE
  // ----------------------------------------------------------------------
  async activate(id: string, callerId: string, callerRole: Role) {
    try {
      const target = await this.prisma.user.findUnique({ where: { id } });
      if (!target) throw new NotFoundException('User not found');

      // --- Authorization/Business Logic Checks (Preserved) ---
      if (!['SUPERADMIN', 'ADMIN'].includes(callerRole))
        throw new ForbiddenException('Insufficient permissions to activate user');
      if (target.role === Role.ADMIN && callerRole !== Role.SUPERADMIN)
        throw new ForbiddenException('Only SUPERADMIN can activate ADMIN users');

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
    } catch (err: any) {
      this.logger.error(`Failed to activate user ID ${id} by caller ${callerId}`, err.stack);
      if (err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to activate user');
    }
  }
}
