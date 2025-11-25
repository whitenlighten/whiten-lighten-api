import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/decorator/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    // The Logger is not available here in the constructor if not injected.
    // We will create a new instance in canActivate or handleRequest.
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip guard for public routes
    }

    // --- START OF DEBUG LOGGING ---
    const logger = new Logger(JwtAuthGuard.name);
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    logger.log(`[TRACE] Guard activated for URL: ${request.method} ${request.url}`);
    if (!authHeader) {
    } else {
    }
    // --- END OF DEBUG LOGGING ---

    return super.canActivate(context);
  }

  // This method is called by Passport to handle the result of the JWT strategy.
  // It's a great place to log why authentication failed.
  handleRequest(err: any, user: any, info: Error, context: ExecutionContext) {
    if (err || !user) {
      new Logger(JwtAuthGuard.name).error(`[TRACE] JWT Validation Failed. Info: ${info?.message}. Error: ${err?.message}`);
    }
    // The super call requires all arguments to be passed through.
    return super.handleRequest(err, user, info, context);
  }
}
