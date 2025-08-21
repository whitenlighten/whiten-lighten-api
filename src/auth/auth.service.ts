import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ok } from 'src/common/helpers/api.response';

/* Create LoginDto */
export class LoginDto {
  email: string;
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

  async sendRegistrationNotification(newUser: { fullName: string; email: string; role: string }) {
    console.log('Fetching admins for notification...');
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null },
      select: { email: true },
    });

    if (admins.length === 0) {
      console.log('No admins found for notification');
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #4CAF50; padding: 10px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Celebrity Dentist Clinic</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">New User Registration</h2>
          <p style="color: #555;">A new user has registered on the platform. Please review their details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Name</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${newUser.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Email</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${newUser.email}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Role</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${newUser.role}</td>
            </tr>
          </table>
          <p style="color: #555;">Please review this user in the admin dashboard.</p>
          <a href="${this.configService.get<string>('DASHBOARD_URL', 'https://yourdomain.com/admin/dashboard')}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </div>
        <div style="text-align: center; padding: 10px; background-color: #f0f0f0; border-radius: 0 0 8px 8px;">
          <p style="color: #777; margin: 0;">&copy; 2025 Celebrity Dentist Clinic. All rights reserved.</p>
        </div>
      </div>
    `;

    for (const admin of admins) {
      console.log(`Sending notification to ${admin.email}...`);
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: admin.email,
        subject: 'New User Registration Notification - Celebrity Dentist Clinic',
        html: htmlContent,
        text: `A new user has registered:\n\nName: ${newUser.fullName}\nEmail: ${newUser.email}\nRole: ${newUser.role}\n\nPlease review in the dashboard: ${this.configService.get<string>('DASHBOARD_URL', 'https://yourdomain.com/admin/dashboard')}`,
      });
      console.log(`Notification sent to ${admin.email}`);
    }
  }

  async register(dto: CreateUserDto) {
    const userResponse = await this.usersService.createUser(dto);
    await this.sendRegistrationNotification({
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role,
    });
    return userResponse;
  }

  async login(dto: LoginDto) {
    const userResponse = await this.usersService.findUserByEmail(dto.email);
    const user = userResponse.data;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
 
    const accessToken = this.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await this.generateRefreshToken(user.id);

    return ok('Login successful', {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  }

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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return refreshToken;
  }

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
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.generateAccessToken({
      userId: storedToken.user.id,
      role: storedToken.user.role,
    });

    return ok('Token refreshed successfully', { accessToken });
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    return ok('Logged out successfully', {});
  }
}