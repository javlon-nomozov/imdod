import { create } from 'zustand';
import type { UserRole } from '@imdod/core';

export interface LocalSessionUser {
  userId: string;
  fullName: string;
  role: UserRole;
  registerId: string;
}

interface LocalSessionState {
  user: LocalSessionUser | null;
  setUser: (user: LocalSessionUser | null) => void;
}

/**
 * PIN login endi doim lokal (Electron main-process) — JWT yo'q. Shuning
 * uchun asosiy POS oqimi uchun `useSessionStore` (JWT asosida) o'rniga
 * shu do'kon ishlatiladi. `useSessionStore` faqat qurilma sozlash
 * (admin login) va katalog import ekranlari uchun qoladi — ular ataylab
 * online-only.
 */
export const useLocalSessionStore = create<LocalSessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
