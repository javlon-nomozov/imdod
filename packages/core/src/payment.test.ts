import { describe, expect, it } from 'vitest';
import { computePayment } from './payment.js';

describe('computePayment', () => {
  it('aniq naqd to‘lovda qaytim bo‘lmaydi', () => {
    const r = computePayment(50_000, [{ method: 'CASH', amount: 50_000 }]);
    expect(r.change).toBe(0);
    expect(r.outstanding).toBe(0);
  });

  it('ortiqcha naqddan qaytim hisoblaydi', () => {
    const r = computePayment(47_000, [{ method: 'CASH', amount: 50_000 }]);
    expect(r.change).toBe(3_000);
    expect(r.outstanding).toBe(0);
  });

  it('naqd + karta aralash to‘lov', () => {
    const r = computePayment(100_000, [
      { method: 'CARD', amount: 60_000 },
      { method: 'CASH', amount: 40_000 },
    ]);
    expect(r.change).toBe(0);
    expect(r.outstanding).toBe(0);
  });

  it('kartadan keyin ortiqcha naqd berilsa, qaytim faqat naqddan', () => {
    const r = computePayment(100_000, [
      { method: 'CARD', amount: 60_000 },
      { method: 'CASH', amount: 50_000 },
    ]);
    expect(r.change).toBe(10_000);
  });

  it('to‘liq to‘lanmagan qismni ko‘rsatadi (nasiya uchun)', () => {
    const r = computePayment(100_000, [{ method: 'CASH', amount: 30_000 }]);
    expect(r.outstanding).toBe(70_000);
    expect(r.change).toBe(0);
  });

  it('nasiya to‘lov usuli qoldiqni yopadi', () => {
    const r = computePayment(100_000, [
      { method: 'CASH', amount: 30_000 },
      { method: 'DEBT', amount: 70_000 },
    ]);
    expect(r.outstanding).toBe(0);
  });

  it('naqd yaxlitlash jamini o‘zgartiradi', () => {
    const r = computePayment(49_800, [{ method: 'CASH', amount: 50_000 }], {
      cashRoundingStep: 500,
    });
    expect(r.due).toBe(50_000);
    expect(r.cashRounding).toBe(200);
    expect(r.change).toBe(0);
  });

  it('faqat karta bo‘lsa yaxlitlash qo‘llanmaydi', () => {
    const r = computePayment(49_800, [{ method: 'CARD', amount: 49_800 }], {
      cashRoundingStep: 500,
    });
    expect(r.due).toBe(49_800);
    expect(r.cashRounding).toBe(0);
  });
});
