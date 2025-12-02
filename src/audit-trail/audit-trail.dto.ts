import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsDateString } from 'class-validator';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page.', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter logs by the ID of the actor who performed the action.',
  })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by the type of entity affected (e.g., "Patient", "Task").',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by the action performed (e.g., "TASK_CREATED").',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'The start date for a date range filter (ISO 8601 format).',
    example: '2023-10-26T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'The end date for a date range filter (ISO 8601 format).',
    example: '2023-10-27T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'A general search term to filter logs by action, description, or entity type.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'A term to filter by roles',
  })
  @IsOptional()
  @IsString()
  roles?: string[];
}
