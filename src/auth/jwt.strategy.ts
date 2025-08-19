import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      this.logger.error('JWT_ACCESS_SECRET is not defined in environment variables');
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.log('JwtStrategy initialized successfully');
  }

  async validate(payload: { userId: string; role: string }) {
    if (!payload.userId || !payload.role) {
      this.logger.error('Invalid token payload');
      throw new UnauthorizedException('Invalid token payload');
    }
    return { userId: payload.userId, role: payload.role };
  }
}