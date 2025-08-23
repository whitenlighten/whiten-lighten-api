import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsNumberString, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+2347012345678' })
  @IsOptional()
  @IsPhoneNumber('NG')
  phone: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  @IsOptional()
  @IsString()
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
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.smith@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2347012345678' })
  @IsOptional()
  @IsString()
  phone: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class ApprovePatientDto {
  @ApiProperty({ description: 'Patient ID to approve', example: 'uuid' })
  @IsNotEmpty()
  @IsString()
  patientId: string;
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
      'Comma-separated fields to include (firstName,lastName,middleName,gender,dateOfBirth,age,maritalStatus,occupation,religion,bloodGroup,genotype,phone,alternatePhone,email,address,state,lga,country,emergencyName,emergencyPhone,emergencyRelation,allergies,chronicConditions,pastMedicalHistory,pastSurgicalHistory,currentMedications,immunizationRecords,familyHistory,registrationType,registeredById,registeredBy,insuranceProvider,insuranceNumber,paymentMethod,primaryDoctorId,status,createdAt,updatedAt,createdById,approvedById,clinicalNotes,visits,invoices,Appointment,userId,NoteSuggestion)',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}
