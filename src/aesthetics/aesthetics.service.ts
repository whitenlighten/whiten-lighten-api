import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import { Role } from '@prisma/client';
import { CreateAddonDto, CreateConsentDto, CreateProcedureDto, UpdateAddonDto, UpdateProcedureDto } from './aesthetics.dto';


@Injectable()
export class AestheticsService {
  private readonly logger = new Logger(AestheticsService.name);
  constructor(private prisma: PrismaService) { }

  
 async createProcedure(patientId: string, doctorId: string, dto: CreateProcedureDto) {
    console.log('createProcedure called with:', { dto, patientId, doctorId });
    
    try {
        // Patient validation
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) throw new NotFoundException('Patient not found');

        // Core Logic
      
        const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
        console.log('Scheduled At:', scheduledAt);
        
        
        const created = await this.prisma.aestheticProcedure.create({
            data: {
                patientId,
                doctorId,
                name: dto.name,
                description: dto.description,
                cost: dto.cost ?? undefined,
                scheduledAt,
            },
        });
        
        console.log('Procedure created successfully:', created);
        return created;

   } catch (err: any) {
        this.logger.error(`Failed to create procedure for patient ${patientId}`, err.stack);
        if (err instanceof NotFoundException || err instanceof BadRequestException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to create procedure');
    }

}
async listProcedures(patientId: string, page = 1, limit = 20) {
    try {

        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) throw new NotFoundException('Patient not found');
        
        const skip = (page - 1) * limit;
        
        // Use $transaction for atomic count and findMany operations
        const [total, data] = await this.prisma.$transaction([
            this.prisma.aestheticProcedure.count({ where: { patientId, deletedAt: null } }),
            this.prisma.aestheticProcedure.findMany({
                where: { patientId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { scheduledAt: 'desc' },
                include: { doctor: { select: { id: true, firstName: true, lastName: true, email: true } } }
            }),
        ]);
        
        // Return paginated data
        return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
        
    } catch (err: any) {
        this.logger.error(`Failed to list procedures for patient ${patientId}`, err.stack);
        if (err instanceof NotFoundException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to retrieve procedure list.');
    }
}

async getProcedure(id: string) {
    try {
        const p = await this.prisma.aestheticProcedure.findUnique({ 
            where: { id },
            include: { patient: true, doctor: true }
        });
        
        // Procedure existence and "soft delete" check
        if (!p || p.deletedAt) {
            // Log the client error before throwing 404
            this.logger.warn(`Procedure ID ${id} not found or is deleted.`);
            throw new NotFoundException('Procedure not found');
        }
        
        return p;
        
    } catch (err: any) {
        if (err instanceof NotFoundException) {
            throw err;
        }

        this.logger.error(`Failed to get procedure ID ${id}`, err.stack);
        
        throw new InternalServerErrorException('Failed to retrieve procedure details.');
    }
}

async updateProcedure(id: string, doctorId: string, dto: UpdateProcedureDto) {
    try { 
        const proc = await this.prisma.aestheticProcedure.findUnique({ where: { id } });
        
        if (!proc || proc.deletedAt) {
            this.logger.warn(`Attempt to update non-existent/deleted procedure ID: ${id}`);
            throw new NotFoundException('Procedure not found');
        }

        const scheduledAtUpdate = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;

        return this.prisma.aestheticProcedure.update({
            where: { id },
            data: {
                name: dto.name ?? proc.name,
                description: dto.description ?? proc.description,
                cost: dto.cost ?? proc.cost,
                scheduledAt: scheduledAtUpdate,
            },
        });
        
    } catch (err: any) {
        this.logger.error(`Failed to update procedure ID ${id}`, err.stack);
        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException || err instanceof ConflictException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to update procedure');
    }
}

async deleteProcedure(id: string, doctorId: string) {
    try { 
        const proc = await this.prisma.aestheticProcedure.findUnique({ where: { id } });

        if (!proc || proc.deletedAt) {
            this.logger.warn(`Attempt to delete non-existent/deleted procedure ID: ${id}`);
            throw new NotFoundException('Procedure not found');
        }

        return this.prisma.aestheticProcedure.update({ 
            where: { id }, 
            data: { deletedAt: new Date() } 
        });

    } catch (err: any) {
        this.logger.error(`Failed to delete procedure ID ${id} by doctor ${doctorId}`, err.stack);  

        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to delete procedure');
    }
}

async createConsent(patientId: string, dto: CreateConsentDto) {
    console.log('createConsent called with:', { dto, patientId }); 
    try {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) {
            this.logger.warn(`Attempt to create consent: Patient ID ${patientId} not found.`);
            throw new NotFoundException('Patient not found');
        }

        const consent = await this.prisma.aestheticConsent.create({
            data: {
                patientId,
                fileUrl: dto.fileUrl,
                signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
            },
        });
        
        console.log('Consent created successfully:', consent);
        return consent;
        
    } catch (err: any) {
        this.logger.error(`Failed to create consent for patient ${patientId}`, err.stack);
        
        if (err instanceof NotFoundException) {
            throw err;
        }
        throw new InternalServerErrorException('Failed to create consent');
    }
}

async listConsents(patientId: string, page = 1, limit = 20) {
    try { 
       
      const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        console.log('Patient lookup result:', patient);

        if (!patient) {
            this.logger.warn(`Attempt to create consent: Patient ID ${patientId} not found.`);
            throw new NotFoundException('Patient not found');
        }

        const skip = (page - 1) * limit;
        // Use $transaction for atomic count and findMany operations
        const [total, data] = await this.prisma.$transaction([
            this.prisma.aestheticConsent.count({ where: { patientId, deletedAt: null } }),
            this.prisma.aestheticConsent.findMany({
                where: { patientId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
               include: { doctor: { select: { id: true, firstName: true, lastName: true } } }, 
            }),
        ]);
        
        // Return paginated data
        return { meta: { total, page, limit, pages: Math.ceil(total / limit) }, data };
        
    } catch (err: any) {
        this.logger.error(`Failed to list consents for patient ${patientId}`, err.stack);
        
        if (err instanceof NotFoundException || err instanceof BadRequestException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to retrieve consent list.');
    }
}

async deleteConsent(id: string) {
    try { 
        const c = await this.prisma.aestheticConsent.findUnique({ where: { id } });

        if (!c || c.deletedAt) {
            this.logger.warn(`Attempt to delete non-existent/deleted consent ID: ${id}`);
            throw new NotFoundException('Consent not found');
        }

        return this.prisma.aestheticConsent.update({ 
            where: { id }, 
            data: { deletedAt: new Date() } 
        });

    } catch (err: any) {
        this.logger.error(`Failed to delete consent ID ${id}`, err.stack);

        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to delete consent');
    }
}

async addAddon(procedureId: string, dto: CreateAddonDto) {
    try { 
        const proc = await this.prisma.aestheticProcedure.findUnique({ where: { id: procedureId } });
        
        if (!proc || proc.deletedAt) {
            this.logger.warn(`Attempt to add addon to non-existent/deleted procedure ID: ${procedureId}`);
            throw new NotFoundException('Procedure not found');
        }

        return this.prisma.aestheticAddon.create({
            data: {
                procedureId,
                name: dto.name,
                price: dto.price ?? undefined,
                notes: dto.notes ?? undefined,
            },
        });
        
    } catch (err: any) {
        this.logger.error(`Failed to add addon to procedure ${procedureId}`, err.stack);

        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to add addon');
    }
}

async listAddons(procedureId: string) {
    return this.prisma.aestheticAddon.findMany({ where: { procedureId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

async updateAddon(id: string, dto: UpdateAddonDto,) {
    try { 
        const a = await this.prisma.aestheticAddon.findUnique({ where: { id } });
        
        if (!a || a.deletedAt) {
            this.logger.warn(`Attempt to update non-existent/deleted addon ID: ${id}`);
            throw new NotFoundException('Addon not found');
        }

        return this.prisma.aestheticAddon.update({ 
            where: { id }, 
            data: { 
                name: dto.name ?? a.name, 
                price: dto.price ?? a.price, 
                notes: dto.notes ?? a.notes 
            } 
        });
        
    } catch (err: any) {
        this.logger.error(`Failed to update addon ID ${id}`, err.stack);

        if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof ForbiddenException) {
            throw err;
        }

        throw new InternalServerErrorException('Failed to update addon');
    }
}

async deleteAddon(id: string) {
    try { 
        const a = await this.prisma.aestheticAddon.findUnique({ where: { id } });

        if (!a || a.deletedAt) {
            this.logger.warn(`Attempt to delete non-existent/deleted addon ID: ${id}`);
            throw new NotFoundException('Addon not found');
        }

        return this.prisma.aestheticAddon.update({ 
            where: { id }, 
            data: { deletedAt: new Date() } 
        });

    } catch (err: any) {
        this.logger.error(`Failed to delete addon ID ${id}`, err.stack);

        if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
            throw err;
        }

        // Generic fallback for all unhandled database/runtime exceptions
        throw new InternalServerErrorException('Failed to delete addon');
    }
}

}
