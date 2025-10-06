import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2347012345678' })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone!: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '12 Baker Street' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class SelfRegisterPatientDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'john.smith@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+2347012345678' })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone!: string;

  @ApiPropertyOptional({ example: 'MALE', enum: Gender })
  @IsOptional()
  // Use IsEnum to validate values match Gender enum
  @IsString()
  gender?: Gender;
}


export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class ApprovePatientDto {
  @ApiProperty({ description: 'Patient ID to approve', example: 'uuid' })
  @IsNotEmpty()
  @IsString()
  patientId!: string;
}

export class QueryPatientsDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated fields to include (firstName,lastName,gender,dateOfBirth,email,phone,address,etc.)',
    example: 'firstName,lastName,gender,email',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}

export enum HistoryType {
  MEDICAL = 'MEDICAL',
  DENTAL = 'DENTAL',
}

export class AddPatientHistoryDto {

  @ApiProperty({ example: 'Patient has a history of allergies to penicillin.' })
  @IsString()
  @IsNotEmpty()
  notes!: string;
}


export class LogCommunicationDto {
  @ApiProperty({
    description: 'The type of communication (e.g., "SMS", "Email", "In-person")',
    example: 'Email',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'The content or body of the communication message.',
    example: 'Patient confirmed the appointment for tomorrow.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
