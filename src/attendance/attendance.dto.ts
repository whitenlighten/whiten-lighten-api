// src/attendance/dto/staff-clock.dto.ts
import { IsNotEmpty, IsString, IsIn, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StaffClockDto {
  @ApiProperty({
    description: 'The unique ID of the staff member.',
    example: 'staff-uuid-123',
  })
  @IsNotEmpty()
  @IsString()
  staffId!: string;

  @ApiProperty({
    description: "The action: 'IN' for clock-in, 'OUT' for clock-out.",
    enum: ['IN', 'OUT'],
    example: 'IN',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['IN', 'OUT'])
  action!: 'IN' | 'OUT';
}


export class ClientStatusDto {
  @ApiProperty({
    description: "The client attendance status: 'ATTENDED' or 'NO_SHOW'.",
    enum: ['ATTENDED', 'NO_SHOW'],
    example: 'ATTENDED',
  })
  @IsNotEmpty()
  @IsIn(['ATTENDED', 'NO_SHOW'])
  status!: 'ATTENDED' | 'NO_SHOW';
}

export class PaginationQueryDto {
  @ApiProperty({
    description: 'The page number to retrieve.',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'The number of items per page.',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}