/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './user.service';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/auth/decorator/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create User
   * - Superadmin → can create any user
   * - Admin → can create Doctor, Nurse, Frontdesk
   */
  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new staff user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g. duplicate email)' })
  @ApiResponse({ status: 403, description: 'Forbidden (role restriction)' })
  async create(
    @Body() dto: CreateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.createUser(dto, req.user.role);
  }

  /**
   * Get All Users
   * - Only Superadmin & Admin can access
   */
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all staff users (with pagination & filtering)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.getAllUsers(query);
  }

  /**
   * Get User By ID
   */
  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get details of a staff user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  /**
   * Update User
   */
  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update staff user details' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  /**
   * Delete User (Hard Delete)
   * - Only Superadmin can delete
   */
  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a staff user (hard delete)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
