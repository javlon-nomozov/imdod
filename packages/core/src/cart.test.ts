import { describe, expect, it } from 'vitest';
import { computeCart, distribute } from './cart.js';
import { toQty, toPercent } from './money.js';
import type { CartLineInput } from './types.js';

function line(overrides: Partial<CartLineInput> = {}): CartLineInput {
  return {
    id: 'l1',
    productId: 'p1',
    name: 'Daftar 48 varaq',
    unit: 'DONA',
    qty: toQty(1),
    unitPrice: 10_000,
    priceType: 'RETAIL',
    costPrice: 7_000,
    ...overrides,
  };
}

describe('distribute', () => {
  it('yig‘indi har doim aniq summaga teng bo‘ladi', () => {
    const shares = distribute(100, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('taqsimlanmaydigan qoldiqni eng katta kasrga beradi', () => {
    // 10 ni 3 ta teng qatorga: 3.33 → 4, 3, 3
    const shares = distribute(10, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10);
    expect(shares.filter((s) => s === 4)).toHaveLength(1);
  });

  it('og‘irlikka proporsional taqsimlaydi', () => {
    expect(distribute(300, [100, 200])).toEqual([100, 200]);
  });

  it('og‘irliklar yig‘indisi nol bo‘lsa ham summani yo‘qotmaydi', () => {
    const shares = distribute(500, [0, 0]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(500);
  });

  it('nol summani taqsimlaganda hammasi nol', () => {
    expect(distribute(0, [10, 20])).toEqual([0, 0]);
  });
});

describe('computeCart', () => {
  it('oddiy savatni hisoblaydi', () => {
    const cart = computeCart([line({ qty: toQty(3) })]);
    expect(cart.totals.gross).toBe(30_000);
    expect(cart.totals.total).toBe(30_000);
    expect(cart.totals.profit).toBe(9_000); // (10000-7000) * 3
  });

  it('kasrli miqdorni to‘g‘ri hisoblaydi (1.5 kg)', () => {
    const cart = computeCart([line({ unit: 'KG', qty: toQty(1.5), unitPrice: 12_000 })]);
    expect(cart.totals.gross).toBe(18_000);
  });

  it('qator chegirmasini qo‘llaydi', () => {
    const cart = computeCart([line({ discountPercent: toPercent(10) })]);
    expect(cart.totals.lineDiscount).toBe(1_000);
    expect(cart.totals.total).toBe(9_000);
  });

  it('savat chegirmasini qatorlarga taqsimlaydi va jam aniq to‘g‘ri keladi', () => {
    const cart = computeCart(
      [
        line({ id: 'a', unitPrice: 3_333 }),
        line({ id: 'b', unitPrice: 3_333 }),
        line({ id: 'c', unitPrice: 3_334 }),
      ],
      { percent: toPercent(10) },
    );

    // Eng muhim invariant: qatorlar yig'indisi = savat jami.
    const sumOfLines = cart.lines.reduce((acc, l) => acc + l.total, 0);
    expect(sumOfLines).toBe(cart.totals.total);
  });

  it('chegirma jamidan oshib ketmaydi (manfiy chek bo‘lmaydi)', () => {
    const cart = computeCart([line()], { amount: 999_999 });
    expect(cart.totals.total).toBe(0);
    expect(cart.totals.cartDiscount).toBe(10_000);
  });

  it('bo‘sh savat nol qaytaradi', () => {
    const cart = computeCart([]);
    expect(cart.totals.total).toBe(0);
    expect(cart.lines).toHaveLength(0);
  });

  it('foyda savat chegirmasidan keyin hisoblanadi', () => {
    // 10 000 narx, 7 000 tan narx, 20% savat chegirmasi → 8 000 sotuv, 1 000 foyda
    const cart = computeCart([line()], { percent: toPercent(20) });
    expect(cart.totals.total).toBe(8_000);
    expect(cart.totals.profit).toBe(1_000);
  });
});
