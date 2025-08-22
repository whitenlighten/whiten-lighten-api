/* eslint-disable prettier/prettier */
import { IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'newdoctor@example.com',
    description: 'Updated email address for the user',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: 'NewStrongPass123!',
    description: 'New password for the user (min 6 characters)',
  })
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({
    example: 'NURSE',
    enum: Role,
    description: 'Updated role for the user',
  })
  @IsEnum(Role, { message: 'Role must be one of SUPERADMIN, ADMIN, DOCTOR, NURSE, FRONTDESK' })
  @IsOptional()
  role?: Role;
}
