import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from 'src/users/user.interface';

export const GetUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user; // populated by JwtStrategy
});