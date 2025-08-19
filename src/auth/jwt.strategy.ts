import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET', 'default-secret'), // Fallback for testing
    });
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret === 'your-secure-jwt-secret-key-here') {
      this.logger.error('JWT_ACCESS_SECRET is not defined or is a placeholder in environment variables');
      throw new Error('JWT_ACCESS_SECRET is not properly configured');
    }
    this.logger.log('JwtStrategy initialized successfully');
  }

  async validate(payload: { userId: string; role: string }) {
    if (!payload.userId || !payload.role) {
      this.logger.error('Invalid token payload');
      throw new UnauthorizedException('Invalid token payload');
    }
    this.logger.log(`Validated payload: userId=${payload.userId}, role=${payload.role}`);
    return { userId: payload.userId, role: payload.role };
  }
}