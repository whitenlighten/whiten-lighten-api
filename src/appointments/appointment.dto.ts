import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsNotEmpty, IsEmail, IsInt, Min, Max } from 'class-validator';
import { AppointmentStatus } from './appointments.enum';

/**
 * DTO for creating an appointment (used by staff/admin)
 */
export class CreateAppointmentDto {
  @ApiProperty({ description: 'Patient ID for this appointment' })
  @IsNotEmpty()
  @IsString()
  patientId!: string; // must be provided

  @ApiProperty({ description: 'Doctor ID for this appointment', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string; // optional, staff may assign later

  @ApiProperty({ description: 'Scheduled appointment date' })
  @IsDateString()
  date!: string; // required ISO date string

  @ApiProperty({ description: 'Reason for the appointment', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Status of the appointment', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty({ description: 'Service type', default: 'General Consultation' })
  @IsString()
  service: string = 'General Consultation'; // default to avoid TS2564
}

/**
 * DTO for public booking (patients can self-register + book)
 */
export class PublicBookAppointmentDto {
  // Patient info
  @ApiProperty({ description: 'Patient first name' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Patient last name' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ description: 'Patient email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Patient phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  // Appointment info
  @ApiProperty({ description: 'Doctor ID (optional)', required: false })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiProperty({ description: 'Scheduled appointment date' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Service type', required: false })
  @IsOptional()
  @IsString()
  service: string = 'General Consultation';

  @ApiProperty({ description: 'Reason for the appointment', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for self-booking a simplified appointment
 */
export class SelfBookAppointmentDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '07012345678' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '2025-09-01T10:00:00Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating an appointment (partial update)
 */
export class UpdateAppointmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for querying appointments (filter/search)
 */

export class QueryAppointmentsDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Text search query for reason or service' })
  @IsOptional()
  @IsString()
  q?: string; // Missing: Property for text search

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number; // Missing: Property for pagination

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number; // Missing: Property for pagination

  @ApiPropertyOptional({ description: 'Comma-separated list of fields to project' })
  @IsOptional()
  @IsString()
  fields?: string;
}
