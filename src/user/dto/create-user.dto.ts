/* eslint-disable prettier/prettier */
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client'
export class CreateUserDto {
  @ApiProperty({
    example: 'doctor@example.com',
    description: 'Unique email address for the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password for the user (min 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    example: 'DOCTOR',
    enum: Role,
    description: 'Role assigned to the user',
  })
  @IsEnum(Role, { message: 'Role must be one of SUPERADMIN, ADMIN, DOCTOR, NURSE, FRONTDESK' })
  role: Role;
}
