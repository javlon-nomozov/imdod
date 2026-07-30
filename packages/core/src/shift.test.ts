import { describe, expect, it } from 'vitest';
import { computeExpectedCash } from './shift';

describe('computeExpectedCash', () => {
  it('savdosiz smena uchun boshlang‘ich naqdni qaytaradi', () => {
    expect(computeExpectedCash(100_000, [])).toBe(100_000);
  });

  it('naqd to‘lovni qo‘shadi', () => {
    const sales = [{ totalAmount: 10_000, payments: [{ method: 'CASH' as const, amount: 10_000 }] }];
    expect(computeExpectedCash(100_000, sales)).toBe(110_000);
  });

  it('kartani hisobga olmaydi (faqat naqd)', () => {
    const sales = [{ totalAmount: 10_000, payments: [{ method: 'CARD' as const, amount: 10_000 }] }];
    expect(computeExpectedCash(100_000, sales)).toBe(100_000);
  });

  it('nasiyani hisobga olmaydi', () => {
    const sales = [{ totalAmount: 10_000, payments: [{ method: 'DEBT' as const, amount: 10_000 }] }];
    expect(computeExpectedCash(100_000, sales)).toBe(100_000);
  });

  it('naqd qaytimni to‘g‘ri ayiradi', () => {
    // 10 000 so'mlik savdo, 20 000 naqd berilgan — 10 000 qaytim.
    const sales = [{ totalAmount: 10_000, payments: [{ method: 'CASH' as const, amount: 20_000 }] }];
    expect(computeExpectedCash(0, sales)).toBe(10_000);
  });

  it('bir nechta savdoni yig‘adi', () => {
    const sales = [
      { totalAmount: 5_000, payments: [{ method: 'CASH' as const, amount: 5_000 }] },
      { totalAmount: 3_000, payments: [{ method: 'CARD' as const, amount: 3_000 }] },
      { totalAmount: 2_000, payments: [{ method: 'CASH' as const, amount: 2_000 }] },
    ];
    expect(computeExpectedCash(50_000, sales)).toBe(57_000);
  });
});
