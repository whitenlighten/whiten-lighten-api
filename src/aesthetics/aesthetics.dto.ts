// src/modules/aesthetics/dto/create-procedure.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateProcedureDto {
  @ApiProperty({ example: 'Botox injection' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Forehead wrinkles - Botox' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 250.0 })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ example: '2025-10-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {}

export class CreateConsentDto {
  @ApiProperty({ example: 'https://storage.s3.amazonaws.com/consents/abc.pdf' })
  @IsNotEmpty()
  @IsString()
  fileUrl!: string;

  @ApiPropertyOptional({ example: '2025-10-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional({ description: 'Approving doctor id (if already known)' })
  @IsOptional()
  @IsString()
  doctorId?: string;
}

export class CreateAddonDto {
  @ApiProperty({ example: 'Post-care serum' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 20.0 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAddonDto extends PartialType(CreateAddonDto) {}