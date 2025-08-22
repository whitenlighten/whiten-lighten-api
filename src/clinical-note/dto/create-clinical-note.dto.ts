import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClinicalNoteDto {
  @ApiProperty({ example: 'Patient has shown improvement in blood pressure.' })
  @IsString()
  @IsNotEmpty()
  note: string;
}
