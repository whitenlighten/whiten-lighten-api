import { Controller, Get, Logger, Query, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditTrailService } from './auditTrail.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { AuditQueryDto } from './audit-trail.dto';

@ApiTags('Audit Trail')
@Controller('audit-trail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard) //
export class AuditTrailController {
  private readonly logger = new Logger(AuditTrailController.name);

  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Retrieve all audit trail logs with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved audit logs.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  findAll(@Query() query: AuditQueryDto) {
    this.logger.log('Request passed guards and reached findAll method in AuditTrailController.');
    return this.auditTrailService.findAll(query);
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get statistics about audit log activity' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved audit statistics.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  getStatistics() {
    this.logger.log('Request to get audit statistics.');
    return this.auditTrailService.getStatistics();
  }

  @Get('entity/:entityType/:entityId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get the audit history for a specific entity' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved entity audit history.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  findByEntity(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    this.logger.log(`Request for audit history for ${entityType}:${entityId}.`);
    return this.auditTrailService.findByEntity(entityType, entityId);
  }
}
