// src/dtos/medical-record.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RecordType {
  HISTORY = 'HISTORY',
  ALLERGY = 'ALLERGY',
}

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

// DTO for creating a medical record
export class CreateMedicalRecordDto {
  @ApiProperty({ enum: RecordType, description: 'Type of the medical record' })
  @IsEnum(RecordType)
  type: RecordType;

  @ApiProperty({ description: 'Name of the medical record' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Additional notes about the medical record' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date when the condition was diagnosed', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @ApiPropertyOptional({ description: 'Date when the condition was resolved', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ enum: AllergySeverity, description: 'Severity of allergy if applicable' })
  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;

  @ApiProperty({ description: 'ID of the patient this record belongs to' })
  @IsString()
  patientId: string;
}

// DTO for updating a medical record
export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ enum: RecordType, description: 'Type of the medical record' })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ description: 'Name of the medical record' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the medical record' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date when the condition was diagnosed', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;

  @ApiPropertyOptional({ description: 'Date when the condition was resolved', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiPropertyOptional({ enum: AllergySeverity, description: 'Severity of allergy if applicable' })
  @IsOptional()
  @IsEnum(AllergySeverity)
  severity?: AllergySeverity;
}
