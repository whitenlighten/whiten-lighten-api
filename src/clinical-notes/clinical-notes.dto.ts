import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateClinicalNoteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content!: string; // <-- mark as required

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}

export class UpdateClinicalNoteDto extends PartialType(CreateClinicalNoteDto) {}

export class CreateNoteSuggestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content!: string; // <-- mark as required
}

export class QueryClinicalNotesDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search term for observations, notes, etc.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated fields to include (patientId,createdById,observations,doctorNotes,treatmentPlan,status,etc.)',
    example: 'patientId,observations,doctorNotes',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}

