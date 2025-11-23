// src/modules/aesthetics/aesthetics.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags,} from '@nestjs/swagger';
import { AestheticsService } from './aesthetics.service';
import { CreateProcedureDto, UpdateProcedureDto, CreateConsentDto, CreateAddonDto, UpdateAddonDto } from './aesthetics.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('aesthetics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aesthetics')
export class AestheticsController {
    constructor(private readonly service: AestheticsService) {}

    // ------------------ PROCEDURES ------------------
   

    // Create Procedure: POST /aesthetics/:patientId/procedures
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Schedule a new aesthetic procedure for a patient' })
    @Post(':patientId/procedures')
    async createProcedure(
        @Param('patientId') patientId: string, 
        @Body() dto: CreateProcedureDto, 
        @GetUser() user: { userId: string }) {
        return this.service.createProcedure(patientId, user.userId, dto);
    }

    // List Procedures (paginated): GET /aesthetics/:patientId/procedures?page=1&limit=20
    @Get(':patientId/procedures')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List procedures for a patient (paginated)' })
    async listProcedures(
        @Param('patientId') patientId: string, 
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        return this.service.listProcedures(patientId, page, limit);
    }

    // Get single Procedure: GET /aesthetics/procedures/:id
    @Get('procedures/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Retrieve a single aesthetic procedure by ID' }) 
    async getProcedure(
        @Param('id') id: string) {
        return this.service.getProcedure(id);
    }

    // Update single Procedure: PUT /aesthetics/procedures/:id
    @Put('procedures/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR) // Assuming only doctors/admins can update
    @ApiOperation({ summary: 'Update an aesthetic procedure' }) 
    async updateProcedure(
        @Param('id') id: string,
        @Body() dto: UpdateProcedureDto, 
        @GetUser() user: { userId: string}) {
        // The service uses doctorId and doctorRole for internal checks
        return this.service.updateProcedure(id, user.userId, dto);
    }

    // Delete single Procedure: DELETE /aesthetics/procedures/:id
    @Delete('procedures/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR) 
    @ApiOperation({ summary: 'Soft-delete an aesthetic procedure' }) 
    async deleteProcedure( 
        @Param('id') id: string,
        @GetUser() user: { userId: string }) {
        // The service uses doctorId and doctorRole for internal checks
        return this.service.deleteProcedure(id, user.userId);
    }

    // ------------------ CONSENTS ------------------

    // Create Consent: POST /aesthetics/:patientId/consents
    @Post(':patientId/consents')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Record a new consent form for a patient' }) 
    async createConsent(
        @Param('patientId') patientId: string,
        @Body() dto: CreateConsentDto,
        @GetUser() user: { userId: string }) {
        return this.service.createConsent(patientId, user.userId, dto);
    }

    // List Consents: GET /aesthetics/:patientId/consents
    @Get(':patientId/consents')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List consent records for a patient (paginated)' }) 
    async listConsents(
        @Param('patientId') patientId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        return this.service.listConsents(patientId, page, limit);
    }

    // Delete single Consent: DELETE /aesthetics/consents/:id
    @Delete('consents/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR) // Assuming only Doctors/Admins can delete consents
    @ApiOperation({ summary: 'Soft-delete a consent form' }) 
    async deleteConsent(
        @Param('id') id: string,
        @GetUser() user: { userId: string }) {
        return this.service.deleteConsent(id, user.userId);
    }

    // ------------------ ADDONS ------------------

    // Add Addon: POST /aesthetics/procedures/:procedureId/addons
    @Post('procedures/:procedureId/addons') 
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE) // Assuming 'staff' includes frontdesk/nurses, as they handle billing/items
    @ApiOperation({ summary: 'Add a new addon/item to an existing procedure' }) 
    async addAddon(
        @Param('procedureId') procedureId: string, 
        @Body() dto: CreateAddonDto,) {
        return this.service.addAddon(procedureId, dto);
    }

    // List Addons: GET /aesthetics/procedures/:procedureId/addons
    @Get('procedures/:procedureId/addons')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List addons for a specific procedure' }) 
    async listAddons(
        @Param('procedureId') procedureId: string) {
        return this.service.listAddons(procedureId);
    }

    // Update single Addon: PUT /aesthetics/addons/:id
    @Put('addons/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE) // Assuming staff roles can update billing/items
    @ApiOperation({ summary: 'Update an existing addon/item' }) 
    async updateAddon(
        @Param('id') id: string, 
        @Body() dto: UpdateAddonDto,) {
        return this.service.updateAddon(id, dto);
    }

    // Delete single Addon: DELETE /aesthetics/addons/:id
    @Delete('addons/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.FRONTDESK, Role.NURSE) // Assuming staff roles can delete billing/items
    @ApiOperation({ summary: 'Soft-delete an addon/item' }) 
    async deleteAddon(
        @Param('id') id: string,
        @GetUser() user: { userId: string }) {
        return this.service.deleteAddon(id, user.userId);
    }
}