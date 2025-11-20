
import { 
    Injectable, 
    Logger, 
    BadRequestException, 
    InternalServerErrorException 
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'; // Adjust path if necessary
import { AuditQueryDto } from './audit-trail.dto';

// --- 1. UNIFIED DATA INTERFACE ---

export interface AuditLogData {
    action: string;             // e.g., "APPOINTMENT_CREATED"
    entityType: string;         // e.g., "Patient", "Appointment"
    entityId: string | null;    // Unique ID of the affected entity
    actorId: string | null;     // ID of the user performing the action
    actorRole?: string;         // Role of the actor

    // Human Readability
    actionDescription?: string; 

    // Technical Details (for state change/forensics)
    before?: any;               // State of the entity *before* the change (Service 2)
    after?: any;                // State of the entity *after* the change (Service 2)
    details?: any;              // General additional context/metadata (Service 1)
    ipAddress?: string;         // IP address of the request
    userAgent?: string;         // User-Agent string
}


@Injectable()
export class AuditTrailService {
    private readonly logger = new Logger(AuditTrailService.name);

    constructor(private prisma: PrismaService) {}

    
    /**
     * Logs an action to the audit trail (Non-blocking operation).
     * Errors in logging will be reported but will not halt the main business process.
     */
    async log(args: AuditLogData): Promise<void> {
        // 1. Prepare Data and Defaults
        const actorId = args.actorId || 'SYSTEM';
        const actorRole = args.actorRole || 'SYSTEM';
        const entityId = args.entityId ?? 'N/A';
        
        // Basic Validation (Optional, as failure is non-blocking, but good for diagnostics)
        if (!args.action || !args.entityType) {
            this.logger.warn(`[AUDIT-WARN] Missing required logging parameters: action or entityType.`);
            return; // Exit non-critically
        }

        // 2. Generate Human Description
        const finalActionDescription = args.actionDescription || 
            this.generateDefaultDescription(args.action, args.entityType, entityId);

        // 3. Helper for safe JSON serialization (CRITICAL for JSON/Text DB fields)
        const serialize = (data: any) => 
            data && typeof data === 'object' ? JSON.stringify(data, null, 2) : null;

        try {
            // 4. Create Log Entry
            await this.prisma.auditTrail.create({
                data: {
                    action: args.action,
                    entityType: args.entityType,
                    entityId: entityId,
                    actorId: actorId,
                    actorRole: actorRole,
                    actionDescription: finalActionDescription,
                    
                    // State changes and context (serialized)
                    before: serialize(args.before), // Changed from beforeState to before
                    after: serialize(args.after), // Changed from afterState to after
                    details: serialize(args.details), // This property already exists
                    
                    ipAddress: args.ipAddress || null,
                    userAgent: args.userAgent || null,
                },
            });
            this.logger.verbose(`[AUDIT-LOG] Created: ${finalActionDescription} by ${actorId}`);
            
        } catch (error: any) {
            // 5. Non-Blocking Error Handling
            this.logger.error(
                '❌ CRITICAL: Audit trail logging failed (Non-blocking):', 
                error.message, 
                error.stack
            );
        }
    }


    // --------------------------------------------------------------------------------
    // QUERY METHODS
    // --------------------------------------------------------------------------------

    /**
     * Retrieves a paginated and filterable list of all audit trail entries.
     */
    async findAll(query: AuditQueryDto = {}) {
        const { page = 1, limit = 20, search, ...filters } = query;
        this.logger.debug(`[SERVICE] Fetching logs. Page: ${page}, Limit: ${limit}.`);
        
        try {
            const skip = (page - 1) * limit;
            const where: any = {};

            // 1. Basic Filters (Using insensitive partial matching for better UX)
            if (filters.actorId) where.actorId = { contains: filters.actorId, mode: 'insensitive' };
            if (filters.entityType) where.entityType = { contains: filters.entityType, mode: 'insensitive' };
            if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
            
            // 2. Date Range Filtering (Using Service 2's robust end-of-day logic)
            if (filters.startDate || filters.endDate) {
                where.createdAt = {};
                if (filters.startDate) {
                    where.createdAt.gte = this.parseDate(filters.startDate, 'startDate');
                }
                if (filters.endDate) {
                    // Set end date to 23:59:59.999 to include the entire day
                    const endDate = this.parseDate(filters.endDate, 'endDate');
                    endDate.setHours(23, 59, 59, 999); 
                    where.createdAt.lte = endDate;
                }
            }

            // 3. General Search across relevant fields
            if (search) {
                where.OR = [
                    { action: { contains: search, mode: 'insensitive' } },
                    { actionDescription: { contains: search, mode: 'insensitive' } },
                    { entityType: { contains: search, mode: 'insensitive' } },
                    { actorId: { contains: search, mode: 'insensitive' } },
                    { actorRole: { contains: search, mode: 'insensitive' } },
                    // Optionally, search serialized JSON fields like 'details' if DB supports text search
                ];
            }

            this.logger.debug(`[SERVICE] Final 'where' clause: ${JSON.stringify(where)}`);

            // Use $transaction for atomic, efficient count and find queries
            const [total, data] = await this.prisma.$transaction([
                this.prisma.auditTrail.count({ where }),
                this.prisma.auditTrail.findMany({ 
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
            ]);

            return {
                meta: { 
                    total, 
                    page, 
                    limit, 
                    pages: Math.ceil(total / limit) 
                },
                data,
            };
        } catch (error: any) {
            this.logger.error('❌ Failed to fetch audit logs:', error.stack || error);
            // Re-throw if it's a known client error from parseDate
            if (error instanceof BadRequestException) throw error;
            throw new InternalServerErrorException('Failed to fetch audit logs due to an internal server error.');
        }
    }

    /**
     * Retrieves audit logs associated with a specific entity (e.g., all changes to Patient ID 123).
     */
    async findByEntity(entityType: string, entityId: string) {
        try {
            return await this.prisma.auditTrail.findMany({
                where: { entityType, entityId },
                orderBy: { createdAt: 'desc' },
            });
        } catch (error: any) {
             this.logger.error(`❌ Failed to fetch audit logs for entity ${entityType}:${entityId}:`, error.stack || error);
            throw new InternalServerErrorException('Failed to fetch entity audit logs.');
        }
    }
    
    // --------------------------------------------------------------------------------
    // ADMINISTRATIVE METHODS (Service 2's Strength)
    // --------------------------------------------------------------------------------

    /**
     * Get audit statistics, grouped by action, entity, and actor.
     */
    async getStatistics(startDate?: Date, endDate?: Date) {
        const where: any = {};

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [totalLogs, byAction, byEntityType, byActor] = await Promise.all([
            this.prisma.auditTrail.count({ where }),
            this.prisma.auditTrail.groupBy({
                by: ['action'],
                where,
                _count: true,
            }),
            this.prisma.auditTrail.groupBy({
                by: ['entityType'], // Changed from 'entity' to 'entityType' for consistency
                where,
                _count: true,
            }),
            this.prisma.auditTrail.groupBy({
                by: ['actorId'], // Changed from 'actor' to 'actorId' for consistency
                where,
                _count: true,
            }),
        ]);

        return {
            totalLogs,
            byAction: byAction.map((item) => ({ action: item.action, count: item._count })),
            byEntityType: byEntityType.map((item) => ({ entityType: item.entityType, count: item._count })),
            byActor: byActor.map((item) => ({ actorId: item.actorId, count: item._count })),
        };
    }
    
    // --------------------------------------------------------------------------------
    // UTILITY METHODS
    // --------------------------------------------------------------------------------
    
    /**
     * Helper method to generate a human-readable default description for an action.
     * (Retained from Service 1)
     */
    private generateDefaultDescription(action: string, entityType: string, entityId: string): string {
        const entityIdentifier = entityId && entityId !== 'N/A' ? ` (ID: ${entityId})` : '';
        // Convert PascalCase/camelCase entityType to human-readable
        const entityTypeName = entityType.replace(/([A-Z])/g, ' $1').trim() || entityType;

        switch (action) {
            // ... (Include your comprehensive list of case statements here) ...
            case 'USER_LOGIN': return `User logged in.`;
            case 'PATIENT_CREATED': return `A new ${entityTypeName} was created${entityIdentifier}.`;
            case 'APPOINTMENT_RESCHEDULED': return `${entityTypeName} was rescheduled${entityIdentifier}.`;
            // Default catch-all
            default: return `Action '${action}' performed on ${entityTypeName}${entityIdentifier}.`;
        }
    }
    
    /**
     * Safely parses a date string and throws a BadRequestException if invalid.
     * (Retained from Service 1)
     */
    private parseDate(dateString: string, paramName: string): Date {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new BadRequestException(`Invalid date format for '${paramName}'. Please use a valid ISO 8601 date string.`);
        }
        return date;
    }
}