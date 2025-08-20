// src/patients/dto/patient-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Gender, PatientStatus } from '@prisma/client';

export class PatientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender })
  gender: Gender;

  @ApiProperty({ description: 'Emergency contact object' })
  emergencyContact: Record<string, any>;

  @ApiProperty({ required: false })
  medicalHistory?: string;

  @ApiProperty({ required: false })
  allergies?: string;

  @ApiProperty({ required: false })
  dentalHistory?: string;

  @ApiProperty({ enum: PatientStatus })
  status: PatientStatus;
}
