import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+123456789' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'ADMIN', enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
