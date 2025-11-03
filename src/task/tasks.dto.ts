// src/modules/tasks/tasks.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn, IsISO8601 } from 'class-validator';



export class CreateTaskDto {
  @ApiProperty({ example: 'Follow up appointment', description: 'Short task title' })
  @IsNotEmpty() @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Call patient to check recovery', description: 'Detailed description' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'HIGH', enum: ['LOW','MEDIUM','HIGH'] })
  @IsOptional() @IsString()
  @IsIn(['LOW','MEDIUM','HIGH'])
  priority?: string;

  @ApiPropertyOptional({ example: '2025-10-01T09:00:00.000Z', description: 'Due date (ISO 8601)' })
  @IsOptional() @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'doctor-uuid-or-id', description: 'User to assign to' })
  @IsOptional() @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'patient-id', description: 'Optional patient id' })
  @IsOptional() @IsString()
  relatedPatientId?: string;

  @ApiPropertyOptional({ example: 'appointment-id', description: 'Optional appointment id' })
  @IsOptional() @IsString()
  relatedAppointmentId?: string;
}

/** Update parts of a task */
export class UpdateTaskDto {
  @ApiPropertyOptional() 
  @IsOptional() 
  @IsString() 
  title?: string;

  @ApiPropertyOptional() 
  @IsOptional()
   @IsString() 
   description?: string;

  @ApiPropertyOptional({ enum: ['PENDING','COMPLETED','CANCELLED'] }) 
  @IsOptional() 
  @IsString() 
  status?: string;

  @ApiPropertyOptional({ enum: ['LOW','MEDIUM','HIGH'] }) 
  @IsOptional()
  @IsString() 
  priority?: string;

  @ApiPropertyOptional() 
  @IsOptional() 
  @IsISO8601() 
  dueDate?: string;

  @ApiPropertyOptional() 
  @IsOptional() 
  @IsString() 
  assignedToId?: string;
}


export class QueryTasksDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional() 
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 20 })
  @IsOptional() 
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by status', example: 'PENDING' })
  @IsOptional() 
  status?: string;

  @ApiPropertyOptional({ description: 'Search q', example: 'follow' })
  @IsOptional() 
  q?: string;

  @ApiPropertyOptional({ description: 'Assigned to user id', example: '...'})
  @IsOptional() 
  assignedToId?: string;
}
