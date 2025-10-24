// src/modules/ent/dto/create-ent-note.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

/**
 * DTO for creating an ENT clinical note.
 */
export class CreateEntNoteDto {
  @ApiProperty({ example: 'Ear infection summary' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Patient presents with...' })
  @IsNotEmpty()
  @IsString()
  content! : string;
}

export class UpdateEntNoteDto extends PartialType(CreateEntNoteDto) {}

export class CreateEntSymptomDto {
  @ApiProperty({ example: 'Earache' })
  @IsNotEmpty()
  @IsString()
  symptom! : string;


  @ApiPropertyOptional({ example: 'moderate' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Started 2 days ago' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateEntSymptomDto extends PartialType(CreateEntSymptomDto) {}