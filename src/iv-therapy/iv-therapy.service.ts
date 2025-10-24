import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateReactionDto, CreateRecipeDto, CreateSessionDto, UpdateRecipeDto, UpdateSessionDto } from './iv-therapy.dto';


@Injectable()
export class IvTherapyService {
  private readonly logger = new Logger(IvTherapyService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------- Recipes ----------------
  async createRecipe(dto: CreateRecipeDto, userId: string) {
    try {
        const recipe = await this.prisma.ivRecipe.findUnique({ where: { id:userId } });
    if (!recipe) throw new NotFoundException('Patient not found');


        const ivRecipe = await this.prisma.ivRecipe.create({
        data: { ...dto, createdById: userId },
      });
      console.log('Recipe created successfully:', ivRecipe);
      return ivRecipe
    }catch (err: any) {
        this.logger.error(`Failed to create recipe for user ${userId} }`, err.stack);
        if (err instanceof BadRequestException || err instanceof ForbiddenException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to create recipe');
    }
}
// Assuming necessary exceptions are imported
// import { InternalServerErrorException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common'; 

async listRecipes(page = 1, limit = 20) {
    try {
        const skip = (page - 1) * limit;
        // Use $transaction for atomic count and findMany operations
        const [total, data] = await this.prisma.$transaction([
            this.prisma.ivRecipe.count({ where: { deletedAt: null } }),
            this.prisma.ivRecipe.findMany({
                where: { deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                // Include the user who created it for better context
                include: { createdBy: { select: { id: true, firstName: true, lastName: true } } }, 
            }),
        ]);

        const pages = Math.ceil(total / limit); 
        return { meta: { total, page, limit, pages }, data };

    } catch (err: any) {
        this.logger.error(`Failed to list IV recipes.`, err.stack);
        if (err instanceof BadRequestException || err instanceof ForbiddenException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to retrieve recipe list.');
    }
}


async updateRecipe(id: string, dto: UpdateRecipeDto, userId: string, role: Role) { 
    // Note: Added userId and role to the signature for authorization suggestions
    try {        
        const recipe = await this.prisma.ivRecipe.findUnique({ where: { id } });
        
        if (!recipe || recipe.deletedAt) {
            this.logger.warn(`Attempt to update non-existent/deleted IV recipe ID: ${id}`);
            throw new NotFoundException('Recipe not found');
        }

        return this.prisma.ivRecipe.update({
            where: { id },
            data: { ...dto },
        });

    } catch (err: any) {
        this.logger.error(`Failed to update IV recipe ID ${id} by user ${userId}`, err.stack);

        if (err instanceof NotFoundException || 
            err instanceof BadRequestException || 
            err instanceof ForbiddenException) 
        {
            throw err;
        }

        throw new InternalServerErrorException('Failed to update recipe');
    }
}

 
async deleteRecipe(id: string, userId: string, role: Role) {
    try {
        // 1. Recipe Existence Check
        const recipe = await this.prisma.ivRecipe.findUnique({ where: { id } });
        
        if (!recipe || recipe.deletedAt) {
            this.logger.warn(`Attempt to delete non-existent/deleted IV recipe ID: ${id}`);
            throw new NotFoundException('Recipe not found');
        }
        // 3. Core Logic: Perform "soft delete"
        return this.prisma.ivRecipe.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

    } catch (err: any) {
        // Log the error with stack trace for internal review
        this.logger.error(`Failed to delete IV recipe ID ${id} by user ${userId}`, err.stack);
        // Re-throw specific client errors (4xx)
        if (err instanceof NotFoundException || 
            err instanceof BadRequestException || 
            err instanceof ForbiddenException) 
        {
            throw err;
        }
        throw new InternalServerErrorException('Failed to delete recipe');
    }
}

  

async createSession(dto: CreateSessionDto, doctorId: string) {
    try {
        // 1. Patient Existence Check
        const patient = await this.prisma.patient.findUnique({
            where: { id: dto.patientId },
        });
        if (!patient) {
            this.logger.warn(`Attempt to create session: Patient ID ${dto.patientId} not found.`);
            throw new NotFoundException('Patient not found');
        }
        // 2. Recipe Existence Check
        const recipe = await this.prisma.ivRecipe.findUnique({
            where: { id: dto.recipeId },
        });
        if (!recipe || recipe.deletedAt) {
            this.logger.warn(`Attempt to create session: Recipe ID ${dto.recipeId} not found or is deleted.`);
            throw new NotFoundException('Recipe not found');
        }

        const session =  await this.prisma.ivSession.create({
            data: {
                patientId: dto.patientId,
                recipeId: dto.recipeId,
                doctorId,
                date: new Date(dto.date),
                notes: dto.notes,
            },
        });
        console.log('Session created successfully:', session);
        return  session
    } catch (err: any) {
        this.logger.error(`Failed to create session for patient ${dto.patientId} by doctor ${doctorId}`, err.stack);

        if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof ForbiddenException) 
        {throw err;} throw new InternalServerErrorException('Failed to create session');
    }
}

  // Assuming necessary exceptions are imported
// import { InternalServerErrorException, BadRequestException, ForbiddenException, Logger, Role } from '@nestjs/common'; 

async listSessions(page = 1, limit = 20) { // Added role for RBAC
    try {
    
        const skip = (page - 1) * limit;

        // Use $transaction for atomic count and findMany operations
        const [total, data] = await this.prisma.$transaction([
            this.prisma.ivSession.count({ where: { deletedAt: null } }),
            this.prisma.ivSession.findMany({
                where: { deletedAt: null },
                skip,
                take: limit,
                include: { patient: true, recipe: true},
                orderBy: { date: 'desc' },
            }),
        ]);

        const pages = Math.ceil(total / limit); 
        
        return { meta: { total, page, limit, pages }, data };

    } catch (err: any) {
        this.logger.error(`Failed to list IV sessions.`, err.stack);
        if (err instanceof BadRequestException || err instanceof ForbiddenException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to retrieve session list.');
    }
}

  // Assuming necessary exceptions and Role enum are imported
// import { NotFoundException, InternalServerErrorException, ForbiddenException, BadRequestException, Logger, Role } from '@nestjs/common'; 

async updateSession(id: string, dto: UpdateSessionDto, userId: string) {
    try {
        // 1. Session Existence Check
        const session = await this.prisma.ivSession.findUnique({ where: { id } });
        
        if (!session || session.deletedAt) {
            this.logger.warn(`Attempt to update non-existent/deleted IV session ID: ${id}`);
            throw new NotFoundException('Session not found');
        }
        
        const dateUpdate = dto.date ? new Date(dto.date) : session.date;

        return this.prisma.ivSession.update({
            where: { id },
            data: {
                ...dto,
                date: dateUpdate,
            },
        });
        
    } catch (err: any) {

        this.logger.error(`Failed to update session ID ${id} by user ${userId}`, err.stack);
        
        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) 
        { throw err; }
        throw new InternalServerErrorException('Failed to update session');
    }
}

  // Assuming necessary exceptions and Role enum are imported
// import { NotFoundException, InternalServerErrorException, ForbiddenException, BadRequestException, Logger, Role } from '@nestjs/common'; 

async deleteSession(id: string) {
    try {
        const session = await this.prisma.ivSession.findUnique({ where: { id } });
        
        if (!session || session.deletedAt) {
            this.logger.warn(`Attempt to delete non-existent/deleted IV session ID: ${id}`);
            throw new NotFoundException('Session not found');
        }
        console.log('Session lookup result:', session);

        return this.prisma.ivSession.update({
            where: { id },
            data: { deletedAt: new Date() },
            
        });
       
    } catch (err: any) {
        // Log the error with stack trace for internal review
        this.logger.error(`Failed to delete session ID ${id} `, err.stack);
        if (err instanceof NotFoundException ||  err instanceof ForbiddenException ||  err instanceof BadRequestException) 
        { throw err; }

        throw new InternalServerErrorException('Failed to delete session');
    }
}

  // ---------------- Reactions ----------------
  
async recordReaction(sessionId: string, dto: CreateReactionDto, userId: string) { 
    try {
        // 1. Session Existence Check
        const session = await this.prisma.ivSession.findUnique({ where: { id: sessionId } });
        
        if (!session || session.deletedAt) {
            this.logger.warn(`Attempt to record reaction: IV session ID ${sessionId} not found or is deleted.`);
            throw new NotFoundException('Session not found');
        }

        return this.prisma.ivReaction.create({
            data: { 
                ...dto, 
                sessionId, 
                recordedById: userId
            },
        });
    } catch (err: any) {
        
        this.logger.error(`Failed to record reaction for session ${sessionId} by user ${userId}`, err.stack);

        if (err instanceof NotFoundException ||  err instanceof ForbiddenException || err instanceof BadRequestException) 
        { throw err; }
        throw new InternalServerErrorException('Failed to record reaction');
    }
}


async listReactions(sessionId: string, role: Role) { // Added 'role' for Authorization suggestion
    try {
        // ** (Suggested Validation Implementation - Internal Checks Here)**
        // e.g., this.validateIdFormat(sessionId); 
        // e.g., this.checkAuthorization(role); 

        // 1. Session Existence Check (Recommended for clean 404 response)
        const session = await this.prisma.ivSession.findUnique({ where: { id: sessionId } });
        if (!session || session.deletedAt) {
            throw new NotFoundException('IV Session not found');
        }

        // 2. Core Logic: Retrieve reactions
        const reactions = await this.prisma.ivReaction.findMany({
            where: { sessionId, deletedAt: null },
            include: { 
                recordedBy: { select: { id: true, firstName: true, lastName: true } } // Select specific user fields
            },
            orderBy: { createdAt: 'desc' }, // Good practice to order
        });
        
        return reactions;
        
    } catch (err: any) {
        // Log the error with stack trace for internal review
        this.logger.error(`Failed to list reactions for session ${sessionId}`, err.stack);
        
        // Re-throw specific client errors (4xx)
        if (err instanceof NotFoundException ||  err instanceof ForbiddenException ||  err instanceof BadRequestException) 
        {
            throw err;
        }

        throw new InternalServerErrorException('Failed to retrieve reaction list.');
    }
}
}
