import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
} from 'class-validator';

export class CreateClinicalNoteDto {
 
  @ApiPropertyOptional({ description: 'Copied nurse observation / raw content' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: 'Doctor additional notes/diagnosis' })
  @IsOptional()
  @IsString()
  doctorNotes?: string;

  @ApiPropertyOptional({ description: 'Structured treatment plan (legacy)' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  // ---------------------------
  // Extended fields (stored inside extendedData JSON)
  // ---------------------------
  @ApiPropertyOptional({ description: 'Presenting complaint' })
  @IsOptional()
  @IsString()
  presentComplaint?: string;

  @ApiPropertyOptional({ description: 'History of present complaint' })
  @IsOptional()
  @IsString()
  historyOfPresentComplaint?: string;

  @ApiPropertyOptional({ description: 'Dental history' })
  @IsOptional()
  @IsString()
  dentalHistory?: string;

  @ApiPropertyOptional({ description: 'Medical history' })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiPropertyOptional({ description: 'Extra Oral Examination (EOE)' })
  @IsOptional()
  @IsString()
  eoe?: string;

  @ApiPropertyOptional({ description: 'Intra Oral Examination (IOE)' })
  @IsOptional()
  @IsString()
  ioe?: string;

  @ApiPropertyOptional({ description: 'Investigations (e.g., X-ray)' })
  @IsOptional()
  @IsString()
  investigation?: string;

  @ApiPropertyOptional({ description: 'Impression(s) (array)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impression?: string[];

  @ApiPropertyOptional({ description: 'Recommended treatments (array)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedTreatments?: string[];

  @ApiPropertyOptional({ description: 'Estimated duration (human readable)' })
  @IsOptional()
  @IsString()
  estimatedDuration?: string;

  @ApiPropertyOptional({ description: 'Treatment done (short text)' })
  @IsOptional()
  @IsString()
  treatmentDone?: string;

  @ApiPropertyOptional({ description: 'Dentist name (for signature block)' })
  @IsOptional()
  @IsString()
  dentistName?: string;

  @ApiPropertyOptional({ description: 'Dentist signature (url/base64/identifier)' })
  @IsOptional()
  @IsString()
  dentistSignature?: string;

  @ApiPropertyOptional({ description: 'Visit / note date (ISO string)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  // You may also accept a free-form object if UI evolves
  @ApiPropertyOptional({ description: 'Free-form extra data (extensible)' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

export class UpdateClinicalNoteDto extends PartialType(CreateClinicalNoteDto) {}

/** Suggestion DTO (nurse) */
export class CreateNoteSuggestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content!: string;
}

/** Query DTO for pagination and filtering */
export class QueryClinicalNotesDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Comma-separated fields to include' })
  @IsOptional()
  @IsString()
  fields?: string;
}

/** Response DTO for patient auto-populate */
export class PatientAutoPopulateResponseDto {
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() patientId?: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() dateOfBirth?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() registrationType?: string;
}
