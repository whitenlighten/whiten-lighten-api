import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryPatientDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumberString()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumberString()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by name/email/phone' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by approval status' })
  @IsBooleanString()
  @IsOptional()
  isApproved?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Filter partial accounts' })
  @IsBooleanString()
  @IsOptional()
  isPartial?: boolean;
}
