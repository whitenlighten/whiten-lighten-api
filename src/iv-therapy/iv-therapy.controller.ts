// src/modules/iv-therapy/iv-therapy.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags,} from '@nestjs/swagger';
import { IvTherapyService } from './iv-therapy.service';
import { CreateRecipeDto, UpdateRecipeDto, CreateSessionDto, UpdateSessionDto, CreateReactionDto } from './iv-therapy.dto'; // Assuming DTOs are here
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorator/get-user.decorator';

@ApiTags('iv-therapy')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('iv-therapy')
export class IvTherapyController {
    constructor(private readonly service: IvTherapyService) {}

    // ------------------ IV RECIPES ------------------

    // Create Recipe: POST /iv-therapy/recipes
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.PHARMACIST) 
    @ApiOperation({ summary: 'Create a new IV fluid recipe' })
    @Post('recipes')
    async createRecipe(
        @Param('id') id: string,
        @Body() dto: CreateRecipeDto, 
        @GetUser() user: { userId: string}) {
        return this.service.createRecipe(dto, user.userId);
    } 

    // List Recipes (paginated): GET /iv-therapy/recipes?page=1&limit=20
    @Get('recipes')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.PHARMACIST, Role.NURSE) 
    @ApiOperation({ summary: 'List all available IV recipes (paginated)' })
    async listRecipes(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        return this.service.listRecipes(page, limit);
    }

    // Update single Recipe: PUT /iv-therapy/recipes/:id
    @Put('recipes/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.PHARMACIST) // Usually restricted roles for updating medical recipes
    @ApiOperation({ summary: 'Update an IV recipe' }) 
    async updateRecipe(
        @Param('id') id: string,
        @Body() dto: UpdateRecipeDto, 
        @GetUser() user: { userId: string, role: Role }) {
        return this.service.updateRecipe(id, dto, user.userId, user.role);
    }

    // Delete single Recipe: DELETE /iv-therapy/recipes/:id
    @Delete('recipes/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.PHARMACIST) // Highly restricted action
    @ApiOperation({ summary: 'Soft-delete an IV recipe' }) 
    async deleteRecipe(
        @Param('id') id: string, 
        @GetUser() user: { userId: string, role: Role }) {
        return this.service.deleteRecipe(id, user.userId, user.role);
    }
    
    // ------------------ IV SESSIONS ------------------

    // Create Session: POST /iv-therapy/:patientId/sessions
    @Post(':patientId/sessions')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Record a new IV therapy session for a patient' }) 
    async createSession(
        @Param('patientId') patientId: string, 
        @Body() dto: CreateSessionDto, 
        @GetUser() user: { userId: string, role: Role }) {
        // Note: The patientId from the route must be assigned to the DTO if needed in the service
        const sessionDto = { ...dto, patientId };
        return this.service.createSession(sessionDto, user.userId); 
    }

    // List Sessions (paginated): GET /iv-therapy/sessions?page=1&limit=20 (Global List)
    @Get('sessions')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.PHARMACIST) 
    @ApiOperation({ summary: 'List all IV sessions across all patients (paginated)' })
    async listSessions(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, 
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
        return this.service.listSessions(page, limit);
    }
    
    // Update single Session: PUT /iv-therapy/sessions/:id
    @Put('sessions/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Update an existing IV therapy session' }) 
    async updateSession(
        @Param('id') id: string,
        @Body() dto: UpdateSessionDto, 
        @GetUser() user: { userId: string, role: Role }) {
        // Service requires userId for ownership check
        return this.service.updateSession(id, dto, user.userId); 
    }

    // Delete single Session: DELETE /iv-therapy/sessions/:id
    @Delete('sessions/:id')
    @Roles(Role.SUPERADMIN, Role.ADMIN) // Deleting patient treatment records is highly restricted
    @ApiOperation({ summary: 'Soft-delete an IV therapy session' }) 
    async deleteSession(@Param('id') id: string) {
        // Service handles role check internally, but we can rely on the @Roles decorator here
        return this.service.deleteSession(id);
    }

    // ------------------ REACTIONS ------------------
    
    // Record Reaction: POST /iv-therapy/sessions/:sessionId/reactions
    @Post('sessions/:sessionId/reactions')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'Record a patient reaction during or after an IV session' })
    async recordReaction(
        @Param('sessionId') sessionId: string,
        @Body() dto: CreateReactionDto, 
        @GetUser() user: { userId: string }) {
        return this.service.recordReaction(sessionId, dto, user.userId);
    }

    // List Reactions: GET /iv-therapy/sessions/:sessionId/reactions
    @Get('sessions/:sessionId/reactions')
    @Roles(Role.SUPERADMIN, Role.ADMIN, Role.DOCTOR, Role.NURSE) 
    @ApiOperation({ summary: 'List all recorded reactions for a specific IV session' })
    async listReactions(
        @Param('sessionId') sessionId: string,
        @GetUser() user: { role: Role }) {
        return this.service.listReactions(sessionId, user.role);
    }
}