import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateClinicalNoteDto {
  @ApiProperty({ example: 'Updated note text' })
  @IsString()
  @IsNotEmpty()
  note: string;
}

