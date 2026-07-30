import type { UserRole } from '@imdod/core';

/** Access va refresh JWT'lar ichidagi payload. */
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  registerId?: string;
  deviceId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** `DeviceGuard` tomonidan `request.device`ga qo'yiladi. */
export interface DeviceContext {
  id: string;
  registerId: string;
}
