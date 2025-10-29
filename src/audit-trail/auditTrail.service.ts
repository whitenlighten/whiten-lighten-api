// src/audit-trail/audit-trail.service.ts

import { 
    Injectable, 
    BadRequestException, 
    InternalServerErrorException, 
    Logger
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuditTrailService {
    private readonly logger = new Logger(AuditTrailService.name); 

    constructor(private prisma: PrismaService) {} 

    // --------------------------------------------------
    // LOG ACTION
    // --------------------------------------------------
    async log(action: string, entityType: string, entityId: string, actor: any, details?: any, ip?: string) {
        this.logger.debug(`[TRACE] 1. Log initiated for Action: ${action}, Entity: ${entityType}:${entityId}`);
        try {
            if (!action || !entityType) {
                this.logger.warn(`[TRACE] 2. Validation failed: Action or EntityType missing.`);
                throw new BadRequestException('Invalid audit log parameters');
            }

            this.logger.debug(`[TRACE] 3. Preparing data object for Prisma creation.`);
            
            const logEntry = await this.prisma.auditTrail.create({
                data: {
                    action,
                    entityType,
                    entityId,
                    actorId: actor?.id || 'SYSTEM',
                    actorRole: actor?.role || 'SYSTEM',
                    details:
                        details && typeof details === 'object' ? JSON.stringify(details) : String(details ?? null),
                    ipAddress: ip || null,
                },
            });
            
            this.logger.debug(`[TRACE] 4. Database write successful. Log ID: ${logEntry.id}`);
            this.logger.verbose(`Audit log created: ${action} on ${entityType}:${entityId}`);
            return logEntry;
        } catch (error: any) {
            this.logger.error('❌ Audit trail logging failed:', error.stack || error); 
            if (error instanceof BadRequestException) throw error; 
            throw new InternalServerErrorException('Failed to log audit trail');
        }
    } 

    // --------------------------------------------------
    // FIND ALL (DEBUGGING TARGET)
    // --------------------------------------------------
    async findAll(page = 1, limit = 20) {
        this.logger.debug(`[TRACE] 1. FindAll initiated. Params: page=${page}, limit=${limit}`);
        try {
            const skip = (page - 1) * limit;
            
            this.logger.debug(`[TRACE] 2. Calculated SKIP: ${skip}. Starting $transaction.`);

            const [total, data] = await this.prisma.$transaction([
                this.prisma.auditTrail.count(), // Count Query
                this.prisma.auditTrail.findMany({ // Data Query
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            
            this.logger.debug(`[TRACE] 3. $transaction successful. Total count received: ${total}.`);
            this.logger.log(`Successfully fetched ${data.length} audit logs. Total: ${total}`);

            return {
                meta: { total, page, limit, pages: Math.ceil(total / limit) },
                data,
            };
        } catch (error: any) { 
            // ❌ This error log will capture the exact point of failure (e.g., during the DB transaction)
            this.logger.error('❌ Failed to fetch audit logs:', error.stack || error); 
            throw new InternalServerErrorException('Failed to fetch audit logs');
        }
    }

    // --------------------------------------------------
    // FIND BY ACTOR
    // --------------------------------------------------
    async findByActor(actorId: string) {
        this.logger.debug(`[TRACE] 1. FindByActor initiated for ID: ${actorId}`);
        try {
            const data = await this.prisma.auditTrail.findMany({
                where: { actorId },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.debug(`[TRACE] 2. Query complete.`);
            this.logger.log(`Fetched ${data.length} logs for actor ID: ${actorId}`);
            return data;
        } catch (error: any) {
            this.logger.error(`❌ Failed to fetch audit logs for actor ${actorId}:`, error.stack || error);
            throw new InternalServerErrorException('Failed to fetch user audit logs');
        }
    }
}