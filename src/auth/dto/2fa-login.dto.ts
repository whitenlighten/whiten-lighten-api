// src/auth/dto/2fa-login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFaLoginDto {
  @ApiProperty({
    description: 'The user’s email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string; // 👈 Add the exclamation mark

  @ApiProperty({
    description: 'The 6-digit code from the authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  twoFactorAuthenticationCode!: string; // 👈 Add the exclamation mark
}