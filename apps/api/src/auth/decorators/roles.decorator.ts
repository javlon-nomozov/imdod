import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@imdod/core';

export const ROLES_KEY = 'roles';

/** Endpoint uchun ruxsat etilgan rollarni belgilaydi. `RolesGuard` bilan birga ishlaydi. */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
