import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsDateString, IsInt, IsString } from 'class-validator';


export class CreateReminderDto {
  @ApiProperty({
    description: 'The email address to send the reminder to.',
    example: 'recipient.example@company.com', // 👈 Preloaded default
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'The subject line of the reminder email (optional).',
    required: false,
    example: 'Action Required: Follow-up on recent request', // 👈 Preloaded default
  })
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'The main content or body of the reminder message.',
    example: 'Please check the attachment regarding the Q4 report and confirm by end of day.', // 👈 Preloaded default
  })
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'The exact date and time the reminder is scheduled to be sent (ISO 8601 format).',
    type: 'string', // Ensure Swagger knows it's a string
    format: 'date-time',
    // Preload with an example date one hour in the future
    example: new Date(Date.now() + 3600000).toISOString(), 
  })
  @IsDateString()
  scheduledAt!: string;
}




export class ReminderQueryDto {
  @ApiProperty({
    description: 'The page number to retrieve.',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number) // Converts the query string value to a number
  @IsInt()
  page: number = 1; // Default value

  @ApiProperty({
    description: 'The number of items per page.',
    required: false,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number) // Converts the query string value to a number
  @IsInt()
  limit: number = 10; // Default value
}