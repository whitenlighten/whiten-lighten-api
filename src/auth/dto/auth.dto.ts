import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

// ==================== LOGIN DTO ====================
export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperSecret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

// ==================== REGISTER DTO (For SuperAdmin creating users) ====================
export class RegisterUserDto {
  @ApiProperty({ example: 'doctor@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Doctor', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Who', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'StrongPass1', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, example: Role.DOCTOR })
  @IsEnum(Role)
  role: Role;
}

// ==================== FORGOT PASSWORD DTO ====================
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

// ==================== RESET PASSWORD DTO ====================
export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token sent in email link (JWT)' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStrongPassword1', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

// ==================== REFRESH TOKEN DTO ====================
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token as received at login' })
  @IsString()
  refreshToken: string;
}

// ==================== TOKEN RESPONSE DTO ====================
export class TokensResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;
}
