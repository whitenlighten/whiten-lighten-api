/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { userSelect } from './user.select';
import { QueryUserDto } from './dto/query-user.dto';
import { Prisma, Role } from '@prisma/client';

import { ok } from 'src/utils/response';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * createUser
   * Superadmin can create any user (including Admins & Superadmins)
   * Admin can create Doctors, Nurses, Frontdesks
   */
  async createUser(dto: CreateUserDto, currentUserRole: string) {
    try {
      // 1) Check email uniqueness
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail) throw new BadRequestException('Email already exists');

      // 2) Role restriction logic
      if (currentUserRole === 'ADMIN') {
        if (dto.role === 'ADMIN' || dto.role === 'SUPERADMIN') {
          throw new ForbiddenException(
            'Admins cannot create Admin or Superadmin users',
          );
        }
      } else if (currentUserRole !== 'SUPERADMIN') {
        throw new ForbiddenException('You are not allowed to create users');
      }

      // 3) Hash password
      const hashed = await bcrypt.hash(dto.password, 10);

      // 4) Create user
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          role: dto.role,
          password: hashed,
        },
        select: userSelect,
      });

      return {
        message: 'User created successfully',
        data: user,
      };
    } catch (error) {
      console.error('createUser error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new BadRequestException(`${field} already exists`);
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  /**
   * getAllUsers
   */
  async getAllUsers(query: QueryUserDto) {
    try {
      const MAX_LIMIT = 50;
      const page = Math.max(Number(query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(query.limit) || 10, 1), MAX_LIMIT);
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        ...(query.role && { role: query.role }),
      };

      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: userSelect,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return ok('Users retrieved successfully', {
        data: users,
        count: total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('getAllUsers error:', error);
      throw new InternalServerErrorException('Error fetching users');
    }
  }
  /**
   * getUserById
   */
  async getUserById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
      if (!user) throw new NotFoundException('User not found');

      return {
        message: 'User fetched successfully',
        data: user,
      };
    } catch (error) {
      console.error('getUserById error:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  /**
   * updateUser
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    try {
      const exists = await this.prisma.user.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('User not found');

      const data: any = {
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.role && { role: dto.role }),
      };

      if (dto.password) {
        data.password = await bcrypt.hash(dto.password, 10);
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });

      return {
        message: 'User updated successfully',
        data: updated,
      };
    } catch (error) {
      console.error('updateUser error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  /**
   * deleteUser (hard delete)
   */
  async deleteUser(id: string) {
    try {
      const exists = await this.prisma.user.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('User not found');

      const deleted = await this.prisma.user.delete({
        where: { id },
        select: userSelect,
      });

      return {
        message: 'User deleted successfully',
        data: deleted,
      };
    } catch (error) {
      console.error('deleteUser error:', error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error deleting user');
    }
  }
}
