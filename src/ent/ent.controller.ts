// src/modules/ent/ent.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, Req, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags,} from '@nestjs/swagger';
import { EntService } from './ent.service';
import { CreateEntNoteDto, CreateEntSymptomDto, UpdateEntNoteDto, UpdateEntSymptomDto } from './ent.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('ent')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ent')
export class EntController {
    constructor(private readonly service: EntService) {}

    // ------------------ CLINICAL NOTES (ENT NOTE) ------------------

    // Create note: POST /ent/:patientId/notes
    
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Create a new ENT clinical note for a patient' }) // Doumentation added
    @Post(':patientId/notes')
    async createNote(
        @Param('patientId') patientId: string, 
        @Body() dto: CreateEntNoteDto, 
        @GetUser() user: { userId: string }) {
        return this.service.createNote(patientId, user.userId, dto);
    }

    // List notes (paginated): GET /ent/:patientId/notes?page=1&limit=20
    @Get(':patientId/notes')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List ENT notes for a patient (paginated)' })
    async listNotes(
    @Param('patientId') patientId: string, 
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        return this.service.listNotes(patientId, page, limit);
    }

    // Get single note: GET /ent/notes/:id
    @Get('notes/:id')
     @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Retrieve a single ENT clinical note by ID' }) 
    async getNote(
        @Param('id') id: string) {
        return this.service.getNote(id);
    }

    // Update single note: PUT /ent/notes/:id
    @Put('notes/:id')
     @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Update an ENT clinical note (Requires creator or Admin role)' }) // Documentation added
    async updateNote(
        @Param('id') id: string,
        @Body() dto: UpdateEntNoteDto, 
        @GetUser() user: { userId: string }) {
        return this.service.updateNote(id, user.userId, dto);
    }

    // Delete single note: DELETE /ent/notes/:id
    @Delete('notes/:id')
     @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Soft-delete an ENT clinical note (Requires creator or Admin role)' }) // Documentation added
    async deleteNote(@Param('id') id: string, 
    @GetUser() user: { userId: string }) {
        return this.service.deleteNote(id, user.userId);
    }

    // ------------------ SYMPTOMS (ENT SYMPTOM) ------------------

    // Create symptom: POST /ent/:patientId/symptoms
    @Post(':patientId/symptoms')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Create a new ENT symptom record for a patient' }) // Documentation added
    async createSymptom(
        @Param('patientId') patientId: string, 
        @Body() dto: CreateEntSymptomDto, 
        @GetUser() user: { userId: string }) {
        return this.service.createSymptom(patientId, user.userId, dto);
    }

    // List symptoms: GET /ent/:patientId/symptoms
    @Get(':patientId/symptoms')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List ENT symptom records for a patient (paginated)' }) // Documentation added
    async listSymptoms(
        @Param('patientId') patientId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        // Passes patientId and query parameters
        return this.service.listSymptoms(patientId, page, limit);
    }

    // Get single symptom: GET /ent/symptoms/:id
    @Get('symptoms/:id')
        @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
        @ApiOperation({ summary: 'Retrieve a single ENT symptom record by ID' }) // Documentation added
        async getSymptom(@Param('id') id: string) {
        // Passes symptom ID
        return this.service.getSymptom(id);
    }

    // Update single symptom: PUT /ent/symptoms/:id
    @Put('symptoms/:id')
        @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Update an ENT symptom record (Requires creator or Admin role)' }) // Documentation added
    async updateSymptom(@Param('id') id: string, @Body() dto: UpdateEntSymptomDto, @GetUser() user: { userId: string, role: Role }) {
        return this.service.updateSymptom(id, user.userId, dto);
    }

    // Delete single symptom: DELETE /ent/symptoms/:id
    @Delete('symptoms/:id')
        @Roles(Role.SUPERADMIN, Role.ADMIN, Role.FRONTDESK, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Soft-delete an ENT symptom record (Requires creator or Admin role)' }) // Documentation added
    async deleteSymptom(@Param('id') id: string, @GetUser() user: { userId: string, role: Role }) {
        return this.service.deleteSymptom(id, user.userId, user.role);
    }
}