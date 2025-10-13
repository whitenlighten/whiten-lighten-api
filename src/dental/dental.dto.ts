import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsISO8601, IsNumberString, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateDentalChartDto {
  @ApiProperty({ description: 'Patient id (cuid)' })
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @ApiPropertyOptional({ description: 'Optional appointment id' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ description: 'Chart data (free text or JSON)' })
  @IsOptional()
  @IsString()
  chartData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDentalChartDto extends PartialType(CreateDentalChartDto) {}



export class CreateDentalTreatmentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiProperty({ example: 'Filling' })
  @IsNotEmpty()
  @IsString()
  procedure: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cost?: number;
}

export class UpdateDentalTreatmentDto extends PartialType(CreateDentalTreatmentDto) {}

export class CreateDentalRecallDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @ApiProperty({ description: 'ISO date string for recall' })
  @IsNotEmpty()
  @IsISO8601()
  recallDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}
