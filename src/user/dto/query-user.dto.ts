/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class QueryUserDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
  })
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter users by role',
    enum: Role,
    example: 'DOCTOR',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
