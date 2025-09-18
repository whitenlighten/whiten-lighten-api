// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ForgotPasswordDto, LoginDto, RegisterUserDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from 'src/utils/mail.service';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  /* ----------------- REGISTER (create staff users) ----------------- */
  async registerUser(dto: RegisterUserDto) {
    console.log('Registering user with email:', dto.email);
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      console.log('Registration failed: Email already in use.');
      throw new BadRequestException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    console.log('Password hashed successfully.');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
    });

    console.log('User created:', user.email);

    try {
      await this.mailService.sendWelcomeEmail(
        user.email,
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        user.role,
        dto.password,
      );
      console.log('Welcome email sent successfully to:', user.email);
    } catch (err) {
      this.logger?.warn(`Welcome email failed for ${user.email}.`, (err as any).message || err);
      console.error('❌ Failed to send welcome email:', err);
    }

    const { password, ...rest } = user as any;
    console.log('Registration successful, returning user data.');
    return rest;
  }

  /* ----------------- LOGIN ----------------- */
  async login(dto: LoginDto) {
    console.log('Attempting to log in user with email:', dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      console.log('Login failed: Invalid credentials (user not found).');
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('User found:', user.email);

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      console.log('Login failed: Invalid credentials (password mismatch).');
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('Password matches.');

    // --- START OF NEW LOGIC ---
    // Superadmins and Admins don't need 2FA for this example.
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
        console.log(`User ${user.email} is a ${user.role}, skipping 2FA.`);
        const tokens = await this.getTokensAndStoreRefresh(user.id, user.email, user.role);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                is2faEnabled: false,
            },
            ...tokens,
        };
    }
    // --- END OF NEW LOGIC ---

    // For other users, check if 2FA is enabled.
    if (user.twoFactorEnabled) {
      console.log('2FA is enabled. Returning 2FA status.');
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          is2faEnabled: true,
        },
      };
    }

    // For other users who don't have 2FA, return tokens directly.
    console.log('User has no 2FA. Generating and returning tokens.');
    const tokens = await this.getTokensAndStoreRefresh(user.id, user.email, user.role);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        is2faEnabled: false,
      },
      ...tokens,
    };
  }

  /* ----------------- 2FA SETUP ----------------- */
  async generate2FASecret(userId: string) {
    console.log('Generating 2FA secret for user ID:', userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('2FA secret generation failed: User not found.');
      throw new BadRequestException('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Your Company Name', secret);
    console.log('Generated secret and OTP URL.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorTempSecret: secret },
    });
    console.log('Stored temporary 2FA secret for user ID:', userId);

    return { secret, otpAuthUrl };
  }

  async pipeQrCodeStream(stream: any, otpAuthUrl: string) {
    console.log('Piping QR code stream for URL:', otpAuthUrl);
    return toFileStream(stream, otpAuthUrl);
  }

  async enable2FA(userId: string, code: string) {
    console.log('Attempting to enable 2FA for user ID:', userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorTempSecret) {
      console.log('2FA enabling failed: Setup incomplete.');
      throw new BadRequestException('2FA setup incomplete');
    }
    console.log('User and temporary secret found.');

    const isValid = authenticator.check(code, user.twoFactorTempSecret);
    if (!isValid) {
      console.log('2FA enabling failed: Invalid 2FA code.');
      throw new BadRequestException('Invalid 2FA code');
    }
    console.log('2FA code is valid.');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorTempSecret,
        twoFactorTempSecret: null,
      },
    });
    console.log('2FA enabled successfully for user ID:', userId);

    return { message: '2FA enabled successfully' };
  }

  /* ----------------- 2FA FINAL LOGIN ----------------- */
  async validate2FaLogin(email: string, twoFactorAuthenticationCode: string) {
    console.log('Validating 2FA login for email:', email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      console.log('2FA login failed: 2FA is not enabled for this user.');
      throw new UnauthorizedException('2FA is not enabled for this user.');
    }
    console.log('User found and 2FA is enabled.');

    const isValid = authenticator.check(twoFactorAuthenticationCode, user.twoFactorSecret);
    if (!isValid) {
      console.log('2FA login failed: Invalid 2FA code.');
      throw new UnauthorizedException('Invalid 2FA code.');
    }
    console.log('2FA code is valid.');

    const tokens = await this.getTokensAndStoreRefresh(user.id, user.email, user.role);
    console.log('Generated new access and refresh tokens.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    console.log('Updated user last login time.');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        is2faEnabled: user.twoFactorEnabled,
      },
      ...tokens,
    };
  }

  /* ----------------- LOGOUT ----------------- */
  async logout(refreshToken: string) {
    console.log('Attempting to log out.');
    try {
      const payload: any = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      console.log('Refresh token verified successfully.');

      const jti = payload.jti;
      const rt = await this.prisma.refreshToken.findUnique({
        where: { id: jti },
      });
      if (!rt) {
        console.log('Logout failed: Refresh token not found in DB.');
        throw new BadRequestException('Refresh token not found');
      }
      console.log('Refresh token found in DB.');

      await this.prisma.refreshToken.update({
        where: { id: jti },
        data: { revoked: true },
      });
      console.log('Refresh token revoked successfully.');

      return { message: 'Logged out' };
    } catch (e) {
      console.log('Logout failed or token was invalid. Continuing to return logged out message.');
      console.error('Logout error:', e);
      return { message: 'Logged out' };
    }
  }

  /* ----------------- REFRESH ----------------- */
  async refreshToken(refreshToken: string) {
    console.log('Attempting to refresh token.');
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      console.log('Refresh token verified successfully.');
    } catch (e) {
      console.log('Refresh token verification failed.');
      throw new ForbiddenException('Invalid refresh token');
    }

    const jti = payload.jti;
    const userId = payload.sub;
    console.log('Payload extracted. JTI:', jti, 'User ID:', userId);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: jti },
    });
    if (!stored || stored.revoked) {
      console.log('Token refresh failed: Refresh token not found or is revoked.');
      throw new ForbiddenException('Refresh token revoked');
    }
    console.log('Refresh token found in DB and is not revoked.');

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      console.log('Token refresh failed: Refresh token expired. Revoking.');
      throw new ForbiddenException('Refresh token expired');
    }
    console.log('Refresh token has not expired.');

    const isMatch = await bcrypt.compare(refreshToken, stored.token);
    if (!isMatch) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      console.log('Token refresh failed: Provided token does not match stored hash. Revoking.');
      throw new ForbiddenException('Invalid refresh token');
    }
    console.log('Provided token matches the stored hash.');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });
    console.log('Old refresh token revoked.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('Token refresh failed: User not found.');
      throw new ForbiddenException('User not found');
    }
    console.log('User found. Generating new tokens.');

    return this.getTokensAndStoreRefresh(user.id, user.email, user.role);
  }

  /* ----------------- FORGOT PASSWORD ----------------- */
  async forgotPassword(dto: ForgotPasswordDto) {
    console.log('Password reset request for email:', dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      console.log('User not found, but returning success message to prevent enumeration.');
      return { message: 'If an account exists, a reset link was sent.' };
    }
    console.log('User found:', user.email);

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id },
      { secret: this.config.get<string>('JWT_RESET_SECRET'), expiresIn: '1h' },
    );
    console.log('Generated password reset token.');

    const resetUrl = `${this.config.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    console.log('Generated reset URL:', resetUrl);

    try {
      await this.mailService.sendMail(
        user.email,
        'Password reset request',
        `Reset your password here: ${resetUrl}`,
        `
          <p>Hello ${user.firstName ?? ''},</p>
          <p>You requested a password reset. Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      );
      console.log('Password reset email sent successfully.');
    } catch (err) {
      console.error('❌ Failed to send password reset email', err);
      throw new InternalServerErrorException('Failed to send reset email');
    }

    return { message: 'If an account exists, a reset link was sent.' };
  }

  /* ----------------- RESET PASSWORD ----------------- */
  async resetPassword(dto: ResetPasswordDto) {
    console.log('Attempting to reset password with token.');
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.config.get<string>('JWT_RESET_SECRET'),
      });
      console.log('Password reset token verified successfully.');
    } catch (e) {
      console.log('Password reset failed: Invalid or expired token.');
      throw new ForbiddenException('Invalid or expired reset token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('Password reset failed: User not found.');
      throw new BadRequestException('User not found');
    }
    console.log('User found, updating password.');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    console.log('Password updated successfully.');

    return { message: 'Password reset successful' };
  }

  /* ----------------- Helper ----------------- */
  private async getTokensAndStoreRefresh(userId: string, email: string, role: any) {
    console.log('Generating and storing new tokens for user ID:', userId);
    const jti = uuidv4();

    const accessPayload = { sub: userId, email, role };
    const refreshPayload = { sub: userId, email, role, jti };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m',
    });
    console.log('Access token generated.');

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d',
    });
    console.log('Refresh token generated.');

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + this.parseDurationToMs(this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d'),
    );

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        token: hashedRefreshToken,
        userId,
        revoked: false,
        expiresAt,
      },
    });
    console.log('Refresh token stored in database.');

    return { accessToken, refreshToken };
  }

  private parseDurationToMs(t: string) {
    console.log('Parsing duration string:', t);
    if (!t) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(t.replace(/\D/g, ''), 10);
    if (t.endsWith('d')) return num * 24 * 60 * 60 * 1000;
    if (t.endsWith('h')) return num * 60 * 60 * 1000;
    if (t.endsWith('m')) return num * 60 * 1000;
    if (t.endsWith('s')) return num * 1000;
    return num * 1000;
  }
}