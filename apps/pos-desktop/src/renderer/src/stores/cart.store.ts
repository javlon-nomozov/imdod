import { create } from 'zustand';
import type { CartDiscount, CartLineInput } from '@imdod/core';

interface CartState {
  lines: CartLineInput[];
  discount: CartDiscount;
  addLine: (line: CartLineInput) => void;
  updateLine: (id: string, patch: Partial<CartLineInput>) => void;
  removeLine: (id: string) => void;
  setDiscount: (discount: CartDiscount) => void;
  clear: () => void;
}

// Jamilar (totals) BU YERDA hech qachon saqlanmaydi — har doim
// `computeCart(lines, discount)` orqali o'qishda hisoblanadi, shunda
// hisob-kitob bilan ko'rsatilgan qiymat hech qachon bir-biridan farq
// qilmaydi.
export const useCartStore = create<CartState>((set) => ({
  lines: [],
  discount: {},
  addLine: (line) =>
    set((state) => {
      // Bir xil mahsulot+narx turi allaqachon savatda bo'lsa, alohida
      // qator ochmasdan miqdorini qo'shamiz.
      const existingIndex = state.lines.findIndex(
        (l) => l.productId === line.productId && l.priceType === line.priceType,
      );
      if (existingIndex === -1) {
        return { lines: [...state.lines, line] };
      }
      const updated = [...state.lines];
      const existing = updated[existingIndex];
      if (existing) updated[existingIndex] = { ...existing, qty: existing.qty + line.qty };
      return { lines: updated };
    }),
  updateLine: (id, patch) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  removeLine: (id) => set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
  setDiscount: (discount) => set({ discount }),
  clear: () => set({ lines: [], discount: {} }),
}));
