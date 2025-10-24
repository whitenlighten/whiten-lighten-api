import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { DentalService } from './dental.services';
import { CreateDentalChartDto, UpdateDentalChartDto, CreateDentalTreatmentDto, UpdateDentalTreatmentDto, CreateDentalRecallDto, QueryDto } from './dental.dto';

@ApiTags('dental')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dental')
export class DentalController {
  constructor(private readonly service: DentalService) {}

  // ------ Charts ------
@Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Create a dental chart (doctor/admin)' })
  @Post('charts')
  async createChart(@Body() dto: CreateDentalChartDto, 
  @GetUser() user: any,) {
    return this.service.createChart(dto, user.userId, user);
  }

  @Get('charts')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'List dental charts (paginated)' })
  async getCharts(@Query() query: QueryDto) {
    return this.service.getCharts(query);
  }

  @Get('charts/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Get dental chart by id' })
  async getChart(@Param('id') id: string) {
    return this.service.getChartById(id);
  }

  @Patch('charts/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Update dental chart (doctor/admin)' })
  async updateChart(@Param('id') id: string, @Body() dto: UpdateDentalChartDto, @GetUser() user: any) {
    return this.service.updateChart(id, dto, user.userId);
  }

  // ------ Treatments ------
  @Post('treatments')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Create a dental treatment record' })
  async createTreatment(@Body() dto: CreateDentalTreatmentDto, @GetUser() user: any) {
    return this.service.createTreatment(dto, user.userId);
  }

  @Get('treatments')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'List dental treatments (paginated)' })
  async getTreatments(@Query() query: QueryDto) {
    return this.service.getTreatments(query);
  }

  @Get('treatments/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Get treatment by id' })
  async getTreatment(@Param('id') id: string) {
    return this.service.getTreatmentById(id);
  }

  @Patch('treatments/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Update treatment' })
  async updateTreatment(@Param('id') id: string, @Body() dto: UpdateDentalTreatmentDto, @GetUser() user: any) {
    return this.service.updateTreatment(id, dto, user.userId);
  }

  // ------ Recalls ------
  @Post('recalls')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'Create a recall for a patient' })
  async createRecall(@Body() dto: CreateDentalRecallDto, @GetUser() user: any) {
    return this.service.createRecall(dto, user.userId);
  }

  @Get('recalls')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
  @ApiOperation({ summary: 'List recalls (paginated)' })
  async getRecalls(@Query() query: QueryDto) {
    return this.service.getRecalls(query);
  }
}
