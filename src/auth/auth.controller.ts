// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterUserDto,
  ResetPasswordDto,
  TokensResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from 'src/common/decorator/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login: returns access and refresh tokens' })
  @ApiResponse({ status: 201, type: TokensResponseDto })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Create a staff user (Superadmin/Admin action required)',
  })
  async register(@Body() dto: RegisterUserDto) {
    // Access control should be enforced at controller via guards in real app.
    return this.auth.registerUser(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens using refresh token' })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current logged in user (from access token)' })
  async me(@Req() req) {
    // req.user is populated by JwtStrategy.validate
    const { userId } = req.user;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        auditLogs: true,
        emailVerified: true,
        phone: true,
        updatedAt: true,
        refreshTokens: true,
        password: true,
        lastLogin: true,
        deletedAt: true,
        createdAt: true,
      },
    });
    return user;
  }
}
