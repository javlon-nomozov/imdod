import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { DeviceContext } from '../types/auth.types';

/** `DeviceGuard` o'rnatgan `request.device`ni controller parametriga chiqaradi. */
export const CurrentDevice = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): DeviceContext => {
    const request = ctx.switchToHttp().getRequest<Request & { device: DeviceContext }>();
    return request.device;
  },
);
