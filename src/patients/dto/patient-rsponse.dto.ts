// src/patients/dto/patient-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PatientStatus, Gender } from '@prisma/client';

@Exclude() // hide everything by default
export class PatientResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  firstName: string;

  @Expose()
  @ApiProperty()
  lastName: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  phone: string;

  @Expose()
  @ApiProperty()
  address: string;

  @Expose()
  @ApiProperty()
  dateOfBirth: Date;

  @Expose()
  @ApiProperty({ enum: Gender })
  gender: Gender;

  @Expose()
  @ApiProperty({ description: 'Emergency contact JSON' })
  emergencyContact: any;

  @Expose()
  @ApiProperty({ required: false })
  medicalHistory?: string;

  @Expose()
  @ApiProperty({ required: false })
  allergies?: string;

  @Expose()
  @ApiProperty({ required: false })
  dentalHistory?: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
9
  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiProperty({ enum: PatientStatus })
  status: PatientStatus;
}
 