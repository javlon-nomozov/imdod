import { describe, expect, it } from 'vitest';
import { computeCart, formatReceiptNumber, toQty } from '@imdod/core';
import { getMessages } from '@imdod/i18n';

/**
 * Bu test biznes mantiqni emas — MONOREPO ULANISHINI tekshiradi.
 *
 * `@imdod/core` va `@imdod/i18n` CommonJS'ga build qilinadi, NestJS esa
 * CommonJS'da ishlaydi. Agar bu paketlar ESM bo'lib qolsa yoki `dist`
 * build qilinmasa, API kompilyatsiya bo'ladi-yu, serverda
 * "Cannot find module" bo'lib qulaydi — ya'ni xato faqat deploy'dan
 * keyin ma'lum bo'ladi.
 *
 * Shu test ana o'sha nosozlikni CI'da, deploy'dan OLDIN ushlaydi.
 */
describe('monorepo ulanishi', () => {
  it('@imdod/core paketini import qila oladi va hisob to‘g‘ri ishlaydi', () => {
    const cart = computeCart([
      {
        id: 'l1',
        productId: 'p1',
        name: 'Daftar',
        unit: 'DONA',
        qty: toQty(2),
        unitPrice: 5_000,
        priceType: 'RETAIL',
        costPrice: 3_000,
      },
    ]);

    expect(cart.totals.total).toBe(10_000);
    expect(cart.totals.profit).toBe(4_000);
  });

  it('chek raqami kassa prefiksi bilan yasaladi', () => {
    expect(formatReceiptNumber('K01', 7)).toBe('K01-000007');
  });

  it('@imdod/i18n paketini import qila oladi', () => {
    expect(getMessages('uz').payment.cash).toBe('Naqd');
    expect(getMessages('ru').payment.cash).toBe('Наличные');
  });
});
