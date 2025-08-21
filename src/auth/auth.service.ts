import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterUserDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MailService } from 'src/utils/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService, // 👈 injected here
  ) {}

  /* ----------------- REGISTER (create staff users) ----------------- */
  async registerUser(dto: RegisterUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
    });

    const { password, ...rest } = user as any;
    return rest;
  }

  /* ----------------- LOGIN ----------------- */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokensAndStoreRefresh(
      user.id,
      user.email,
      user.role,
    );

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
      },
      ...tokens,
    };
  }

  /* ----------------- LOGOUT ----------------- */
  async logout(refreshToken: string) {
    try {
      const payload: any = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const jti = payload.jti;
      const rt = await this.prisma.refreshToken.findUnique({
        where: { id: jti },
      });
      if (!rt) throw new BadRequestException('Refresh token not found');

      await this.prisma.refreshToken.update({
        where: { id: jti },
        data: { revoked: true },
      });
      return { message: 'Logged out' };
    } catch {
      return { message: 'Logged out' };
    }
  }

  /* ----------------- REFRESH ----------------- */
  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }

    const jti = payload.jti;
    const userId = payload.sub;

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: jti },
    });
    if (!stored || stored.revoked)
      throw new ForbiddenException('Refresh token revoked');

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      throw new ForbiddenException('Refresh token expired');
    }

    const isMatch = await bcrypt.compare(refreshToken, stored.token);
    if (!isMatch) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      throw new ForbiddenException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');

    return this.getTokensAndStoreRefresh(user.id, user.email, user.role);
  }

  /* ----------------- FORGOT PASSWORD ----------------- */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      return { message: 'If an account exists, a reset link was sent.' };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id },
      { secret: this.config.get<string>('JWT_RESET_SECRET'), expiresIn: '1h' },
    );

    const resetUrl = `${this.config.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

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
    } catch (err) {
      console.error('❌ Failed to send password reset email', err);
      throw new InternalServerErrorException('Failed to send reset email');
    }

    return { message: 'If an account exists, a reset link was sent.' };
  }

  /* ----------------- RESET PASSWORD ----------------- */
  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.token, {
        secret: this.config.get<string>('JWT_RESET_SECRET'),
      });
    } catch {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password reset successful' };
  }

  /* ----------------- Helper ----------------- */
  private async getTokensAndStoreRefresh(
    userId: string,
    email: string,
    role: any,
  ) {
    const jti = uuidv4();

    const accessPayload = { sub: userId, email, role };
    const refreshPayload = { sub: userId, email, role, jti };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() +
        this.parseDurationToMs(
          this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d',
        ),
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

    return { accessToken, refreshToken };
  }

  private parseDurationToMs(t: string) {
    if (!t) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(t.replace(/\D/g, ''), 10);
    if (t.endsWith('d')) return num * 24 * 60 * 60 * 1000;
    if (t.endsWith('h')) return num * 60 * 60 * 1000;
    if (t.endsWith('m')) return num * 60 * 1000;
    if (t.endsWith('s')) return num * 1000;
    return num * 1000;
  }
}
