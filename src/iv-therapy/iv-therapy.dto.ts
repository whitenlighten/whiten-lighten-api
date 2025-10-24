import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateRecipeDto {
  @ApiProperty({ example: 'Vitamin C Boost' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Energy and immune support formula' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String], example: ['Vitamin C 500mg', 'Magnesium 100mg'] })
  @IsArray()
  ingredients!: string[];
}


export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {}


export class CreateSessionDto {
  @ApiProperty({ example: 'cmg3fijds0001170qvh8t4mru' })
  @IsNotEmpty()
  @IsString()
  patientId!: string;

  @ApiProperty({ example: 'clz234xyz987' })
  @IsNotEmpty()
  @IsString()
  recipeId!: string;

  @ApiProperty({ example: '2025-10-25T09:00:00Z' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'Initial consultation and IV drip' })
  @IsOptional()
  @IsString()
  notes?: string;
}


export class UpdateSessionDto extends PartialType(CreateSessionDto) {}



export class CreateReactionDto {
  @ApiProperty({ example: 'Nausea' })
  @IsNotEmpty()
  @IsString()
  type!: string;

  @ApiPropertyOptional({ example: 'Mild' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Patient felt dizzy after session' })
  @IsOptional()
  @IsString()
  notes?: string;
}
