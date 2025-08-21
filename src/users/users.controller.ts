// src/modules/users/users.controller.ts
import {
    Controller,
    Post,
    Body,
    UseGuards,
    Get,
    Query,
    Param,
    Patch,
    Delete
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/role.enum';
import { ChangeRoleDto, CreateUserDto, QueryUsersDto, UpdateUserDto } from './users.dto';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // CREATE user - accessible by SUPERADMIN and ADMIN but service enforces detailed rules
  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({
    summary:
      'Create a user (Superadmin/Admin only). Service enforces role rules.',
  })
  async create(@Body() dto: CreateUserDto, @GetUser() user: any) {
    const callerId = user.userId;
    const callerRole = user.role as Role;
    return this.users.create(dto, callerId, callerRole);
  }

  // LIST users - admin+ roles can see; you can restrict further if needed
  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'List users (paginated). Admin/Superadmin only' })
  async list(@Query() query: QueryUsersDto) {
    return this.users.findAll(query);
  }

  // Get single user
  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)
  @ApiOperation({ summary: 'Get user by id (limited fields).' })
  async get(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  // Update user
  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.FRONTDESK)
  @ApiOperation({ summary: 'Update user profile. Self or admin can update.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @GetUser() user: any,
  ) {
    const callerId = user.userId;
    const callerRole = user.role as Role;
    return this.users.update(id, dto, callerId, callerRole);
  }

  // Change role (strict rules enforced)
  @Patch(':id/role')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({
    summary:
      'Change user role. Only Superadmin/Admin can access; service enforces who can assign which role.',
  })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @GetUser() user: any,
  ) {
    const callerId = user.userId;
    const callerRole = user.role as Role;
    return this.users.changeRole(id, dto, callerId, callerRole);
  }

  // Deactivate (soft delete)
  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Soft-delete (deactivate) user. Only admin/superadmin.',
  })
  async deactivate(@Param('id') id: string, @GetUser() user: any) {
    const callerId = user.userId;
    const callerRole = user.role as Role;
    return this.users.softDelete(id, callerId, callerRole);
  }

  // Activate user
  @Patch(':id/activate')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Activate (reactivate) user.' })
  async activate(@Param('id') id: string, @GetUser() user: any) {
    const callerId = user.userId;
    const callerRole = user.role as Role;
    return this.users.activate(id, callerId, callerRole);
  }

  // Optional: Get current user (duplicate of /auth/me but handy)
  @Get('me/profile')
  @Roles(
    Role.SUPERADMIN,
    Role.ADMIN,
    Role.DOCTOR,
    Role.NURSE,
    Role.FRONTDESK,
    Role.PATIENT,
  )
  async me(@GetUser() user: any) {
    return this.users.findOne(user.userId);
  }
}
