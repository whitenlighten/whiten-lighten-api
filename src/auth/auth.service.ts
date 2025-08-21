import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ok } from 'src/common/helpers/api.response';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/* ✅ Fixed LoginDto with validation */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /* ----------------- EMAIL NOTIFICATION ----------------- */
  async sendRegistrationNotification(newUser: { fullName: string; email: string; role: string }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null },
      select: { email: true },
    });

    if (admins.length === 0) return;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New User Registration</h2>
        <p>A new user has registered:</p>
        <ul>
          <li><b>Name:</b> ${newUser.fullName}</li>
          <li><b>Email:</b> ${newUser.email}</li>
          <li><b>Role:</b> ${newUser.role}</li>
        </ul>
        <a href="${this.configService.get<string>('DASHBOARD_URL', 'https://yourdomain.com/admin/dashboard')}">Go to Dashboard</a>
      </div>
    `;

    for (const admin of admins) {
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: admin.email,
        subject: 'New User Registration Notification',
        html: htmlContent,
      });
    }
  }

/* ----------------- REGISTER ----------------- */
async register(dto: CreateUserDto) {
  try {
    const userResponse = await this.usersService.createUser(dto);
    const user = userResponse?.data;

    if (!user) {
      throw new BadRequestException('User could not be created');
    }

    // Send notification but don't break signup if email fails
    try {
      await this.sendRegistrationNotification({
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
      });
    } catch (emailError) {
      console.error('Failed to send registration email:', emailError);
    }

    // Issue tokens
    const accessToken = this.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await this.generateRefreshToken(user.id);

    return ok('User registered successfully', {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Registration error:', err);
    throw new InternalServerErrorException('Registration failed');
  }
}


  /* ----------------- LOGIN ----------------- */
  async login(dto: LoginDto) {
    const userResponse = await this.usersService.findUserByEmail(dto.email);
    const user = userResponse.data;

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) throw new UnauthorizedException('Invalid credentials');

    // ✅ Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // ✅ Generate tokens
    const accessToken = this.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await this.generateRefreshToken(user.id);

    return ok('Login successful', {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  }

  /* ----------------- TOKEN HELPERS ----------------- */
  private generateAccessToken(payload: { userId: string; role: string }) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  private async generateRefreshToken(userId: string) {
    const refreshToken = this.jwtService.sign(
      { userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return refreshToken;
  }

  /* ----------------- REFRESH ----------------- */
  async refreshAccessToken(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.generateAccessToken({
      userId: storedToken.user.id,
      role: storedToken.user.role,
    });

    return ok('Token refreshed successfully', { accessToken });
  }

  /* ----------------- LOGOUT ----------------- */
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    return ok('Logged out successfully', {});
  }
}
