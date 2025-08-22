import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '1990-05-20', required: false })
  @IsOptional()
  dob?: Date;

  @ApiProperty({ example: 'male', required: false })
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ required: false })
  @IsString({ each: true })
  medicalConditions?: string[]

  @ApiProperty({ required: false })
  @IsOptional()
  emergencyContact?: string;
}
