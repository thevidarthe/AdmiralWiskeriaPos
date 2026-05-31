import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: 'ADMIN' | 'MANAGER' | 'BARISTA' | 'WAITER' | 'CASHIER';
  name: string;
  email: string;
}

export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.user?.[data] : req.user;
});
