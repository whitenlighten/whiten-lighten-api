import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Gender, PatientStatus } from "@prisma/client";
import { IsDateString, IsEmail, IsEnum, IsObject, isObject, IsOptional, IsString } from "class-validator";

export class CreatePatientDto{
    
@ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Baker St, Lagos' })
  @IsString()
  address: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dateOfBirth: string;
  
  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Emergency contact object: { name: string, phone: string }',
    example: { name: 'John Doe', phone: '+2348000000000' },
  })
  @IsObject()
  emergencyContact: Record<string, any>; // a plain object stored as JSON in DB



  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dentalHistory?: string;

  // status optional on creation; default is ACTIVE
  @ApiProperty({ enum: PatientStatus, required: false })
  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;


  

  



}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}