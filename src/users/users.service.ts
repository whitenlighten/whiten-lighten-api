/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { ok } from 'src/common/helpers/api.response';
import { userSelect } from './user.select';


@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * createUser
   */
  async createUser(dto: CreateUserDto) {
    try {
      // 1) Check email uniqueness
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing) throw new BadRequestException('Email already exists');

      // 2) Normalize + 3) Hash
      const hashed = await bcrypt.hash(dto.password, 10);

      // 4) Create user
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.toUpperCase(),
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          role: dto.role,
          password: hashed,
        },
        select: userSelect, // ✅ CHANGED: using centralized select
      });

      return ok('User created successfully', user);
    } catch (error) {
      console.error('createUser error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }


  async findUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: userSelect,
      });
      if (!user) throw new NotFoundException('User not found');

      return ok('User fetched successfully', user);
    } catch (error) {
      console.error('findUserByEmail error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  /**
   * getAllUsers (paginated, soft-delete aware)
   */
  async getAllUsers(page = 1, limit = 10) {
    try {
      const MAX_LIMIT = 50;
      const p = Math.max(Number(page) || 1, 1);
      const l = Math.min(Math.max(Number(limit) || 10, 1), MAX_LIMIT);
      const skip = (p - 1) * l;
      const where = { deletedAt: null };

      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          skip,
          take: l,
          select: userSelect, // ✅ CHANGED
        }),
        this.prisma.user.count({ where }),
      ]);

      return ok('Users retrieved successfully', {
        data: users,
        count: total,
        pagination: {
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l),
        },
      });
    } catch (error) {
      console.error('getAllUsers error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
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
        select: userSelect, // ✅ CHANGED
      });
      if (!user) throw new NotFoundException('User not found');

      return ok('User fetched successfully', user);
    } catch (error) {
      console.error('getUserById error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
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
        ...(dto.fullName && { fullName: dto.fullName.toUpperCase() }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.role && { role: dto.role }),
      };

      if (dto.password) {
        data.password = await bcrypt.hash(dto.password, 10);
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: userSelect, // ✅ CHANGED
      });

      return ok('User updated successfully', updated);
    } catch (error) {
      console.error('updateUser error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  /**
   * deleteUser (soft delete)
   */
  async deleteUser(id: string) {
    try {
      const exists = await this.prisma.user.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('User not found');

      const deleted = await this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: userSelect, // ✅ CHANGED
      });

      return ok('User deleted successfully', deleted);
    } catch (error) {
      console.error('deleteUser error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting user');
    }
  }
}
