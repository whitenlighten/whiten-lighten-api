import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClinicalNoteDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}

export class UpdateClinicalNoteDto extends PartialType(CreateClinicalNoteDto) {}

export class CreateNoteSuggestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;
}
