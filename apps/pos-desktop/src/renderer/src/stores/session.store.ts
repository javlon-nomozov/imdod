import { create } from 'zustand';
import type { UserRole } from '@imdod/core';

export interface SessionUser {
  id: string;
  role: UserRole;
  registerId?: string;
  deviceId?: string;
}

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) return {};
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setTokens: (accessToken, refreshToken) => {
    // JWT payload faqat UI uchun (rol/registerId ko'rsatish) dekod
    // qilinadi — imzo TEKSHIRILMAYDI, avtorizatsiya har doim serverda.
    const payload = decodeJwtPayload(accessToken);
    set({
      accessToken,
      refreshToken,
      user: {
        id: String(payload.sub ?? ''),
        role: (payload.role as UserRole) ?? 'CASHIER',
        registerId: payload.registerId as string | undefined,
        deviceId: payload.deviceId as string | undefined,
      },
    });
  },
  clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
