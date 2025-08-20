// src/medical-records/dto/medical-record-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MedicalRecordResponseDto {
  @ApiProperty({ example: 'rec_12345', description: 'Unique ID of the medical record' })
  id: string;

  @ApiProperty({ example: 'pat_67890', description: 'ID of the patient this record belongs to' })
  patientId: string;

  @ApiProperty({ example: 'Doctor', description: 'Type of the medical record (e.g., Doctor, Lab, Radiology)' })
  type: string;

  @ApiProperty({ example: 'Annual physical check-up results', description: 'Short description of the medical record' })
  description: string;

  @ApiProperty({ example: 'Patient is in good health, advised regular exercise.', description: 'Detailed doctor notes or findings' })
  notes: string;

  @ApiProperty({ example: ['blood-test.pdf', 'xray-image.png'], description: 'List of attached documents or file references', required: false })
  attachments?: string[];

  @ApiProperty({ example: 'doc_345', description: 'ID of the doctor/staff who created this record' })
  createdBy: string;

  @ApiProperty({ example: '2025-08-20T10:15:30.000Z', description: 'Date when the record was created' })
  createdAt: Date;

  @ApiProperty({ example: '2025-08-21T08:00:00.000Z', description: 'Date when the record was last updated' })
  updatedAt: Date;
}
