import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { AuditTrailService } from './auditTrail.service';

import { Role } from '@prisma/client';

@ApiTags('Audit Trail')
@Controller('audit-trail')
@UseGuards(JwtAuthGuard)
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @UseGuards(RolesGuard) // Apply RolesGuard specifically to this method
  @ApiOperation({ summary: 'Get paginated audit logs (role based)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE)
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Req() req: any) {
    console.log('--- HIT /audit-trail endpoint ---');
    console.log(`Query params: page=${page}, limit=${limit}`);
    const user = req.user;
    return this.auditTrailService.findAll(+page, +limit, user);
  }
}
