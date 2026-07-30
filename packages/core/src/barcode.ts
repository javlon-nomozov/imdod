/**
 * SHTRIX-KOD.
 *
 * Imdod'ning muhim talabi:
 *   - bitta mahsulotda BIR NECHTA shtrix-kod bo'lishi mumkin
 *   - bitta shtrix-kod BIR NECHTA mahsulotga tegishli bo'lishi mumkin
 *
 * Ikkinchisi g'alati tuyulishi mumkin, lekin kanstovarda odatiy hol:
 * xitoy ta'minotchilari bir xil generik kodni turli tovarlarga yopishtiradi.
 * Shuning uchun bazada `code` ustuni UNIQUE emas — skanerlash natijasi
 * har doim RO'YXAT, hech qachon bitta yozuv emas.
 */

export type ScanOutcome<TProduct> =
  | { kind: 'none'; code: string }
  | { kind: 'single'; code: string; product: TProduct }
  | { kind: 'multiple'; code: string; products: TProduct[] };

/**
 * Qidiruv natijasini kassir uchun tushunarli holatga aylantiradi.
 *   none     → "Topilmadi. Yangi mahsulot yaratasizmi?"
 *   single   → darhol savatga qo'shiladi
 *   multiple → tanlash oynasi ochiladi
 */
export function resolveScan<TProduct>(code: string, products: TProduct[]): ScanOutcome<TProduct> {
  const trimmed = code.trim();
  if (products.length === 0) return { kind: 'none', code: trimmed };
  if (products.length === 1) {
    // `products[0]` mavjudligi yuqorida tekshirildi, lekin
    // noUncheckedIndexedAccess uchun aniq tekshiramiz.
    const product = products[0];
    if (product !== undefined) return { kind: 'single', code: trimmed, product };
  }
  return { kind: 'multiple', code: trimmed, products };
}

/** EAN-13 nazorat raqamini hisoblaydi (etiketka chop etish uchun). */
export function ean13CheckDigit(digits12: string): number {
  if (!/^\d{12}$/.test(digits12)) {
    throw new Error('EAN-13 uchun aynan 12 ta raqam kerak');
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = digits12.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** To'liq EAN-13 kod yasaydi (12 raqam + nazorat raqami). */
export function buildEan13(digits12: string): string {
  return digits12 + ean13CheckDigit(digits12).toString();
}

/** Kod haqiqiy EAN-13 mi (nazorat raqami to'g'rimi). */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === code.charCodeAt(12) - 48;
}

/**
 * Do'konning o'z ichki shtrix-kodi (zavod kodi yo'q tovarlar uchun).
 * `2` bilan boshlanadi — GS1 standarti bo'yicha bu prefiks
 * do'kon ichki foydalanishi uchun ajratilgan, ya'ni haqiqiy
 * zavod kodlari bilan hech qachon to'qnashmaydi.
 */
export function buildInternalBarcode(sequence: number): string {
  if (sequence < 0 || sequence > 99_999_999_99) {
    throw new Error('Ichki shtrix-kod ketma-ketligi chegaradan chiqdi');
  }
  const body = '2' + sequence.toString().padStart(11, '0');
  return buildEan13(body);
}
