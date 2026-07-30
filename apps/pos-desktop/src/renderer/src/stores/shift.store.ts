import { create } from 'zustand';
import type { Shift } from '../api/types';

interface ShiftState {
  shift: Shift | null;
  setShift: (shift: Shift | null) => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  shift: null,
  setShift: (shift) => set({ shift }),
}));
