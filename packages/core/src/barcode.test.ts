import { describe, expect, it } from 'vitest';
import { buildEan13, buildInternalBarcode, isValidEan13, resolveScan } from './barcode.js';
import { formatReceiptNumber, parseReceiptNumber } from './receipt-number.js';

describe('resolveScan', () => {
  it('topilmasa none qaytaradi', () => {
    expect(resolveScan('123', []).kind).toBe('none');
  });

  it('bitta topilsa single qaytaradi', () => {
    const r = resolveScan('123', ['p1']);
    expect(r.kind).toBe('single');
    if (r.kind === 'single') expect(r.product).toBe('p1');
  });

  it('bir kod bir necha mahsulotga tegishli bo‘lsa multiple qaytaradi', () => {
    const r = resolveScan('123', ['p1', 'p2']);
    expect(r.kind).toBe('multiple');
    if (r.kind === 'multiple') expect(r.products).toHaveLength(2);
  });
});

describe('EAN-13', () => {
  it('nazorat raqamini to‘g‘ri hisoblaydi', () => {
    // Ma'lum haqiqiy kod: 4006381333931
    expect(buildEan13('400638133393')).toBe('4006381333931');
    expect(isValidEan13('4006381333931')).toBe(true);
  });

  it('noto‘g‘ri nazorat raqamini rad etadi', () => {
    expect(isValidEan13('4006381333930')).toBe(false);
  });

  it('ichki kod 2 bilan boshlanadi va haqiqiy bo‘ladi', () => {
    const code = buildInternalBarcode(42);
    expect(code.startsWith('2')).toBe(true);
    expect(isValidEan13(code)).toBe(true);
  });

  it('ichki kodlar takrorlanmaydi', () => {
    expect(buildInternalBarcode(1)).not.toBe(buildInternalBarcode(2));
  });
});

describe('chek raqami', () => {
  it('qurilma prefiksi bilan formatlaydi', () => {
    expect(formatReceiptNumber('K02', 123)).toBe('K02-000123');
  });

  it('formatlangan raqamni qayta o‘qiy oladi', () => {
    expect(parseReceiptNumber('K02-000123')).toEqual({ registerCode: 'K02', seq: 123 });
  });

  it('noto‘g‘ri formatni rad etadi', () => {
    expect(parseReceiptNumber('salom')).toBeNull();
  });
});
