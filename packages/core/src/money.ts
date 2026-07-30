/**
 * PUL VA MIQDOR — butun sonli arifmetika.
 *
 * Nega butun son? Suzuvchi nuqtali (float) arifmetikada 0.1 + 0.2 !== 0.3.
 * Kassa tizimida bu bir kunda tiyinlab farq to'planib, smena yopilganda
 * "variance" bo'lib chiqadi. Shuning uchun hamma joyda butun son ishlatamiz:
 *
 *   PUL      → butun so'm.        12 000 so'm = 12000
 *   MIQDOR   → mingdan bir ulush.  1.5 kg     = 1500
 *
 * Bu qaror butun tizim bo'ylab amal qiladi: Postgres'da ham, POS'dagi
 * SQLite'da ham bir xil `Int` ustunlar. Sinxronizatsiya paytida hech qanday
 * turdan-turga o'tkazish (va shu bilan xato) bo'lmaydi.
 */

/** Butun so'm. Hech qachon kasrli bo'lmaydi. */
export type Sum = number;

/** Miqdor, mingdan bir ulushda. 1000 = 1 dona/kg/metr. */
export type Qty = number;

/** Bitta birlik = 1000 milli-birlik. */
export const QTY_SCALE = 1000;

/** Foizlar ham butun sonda: 12.5% = 1250 (yuzdan bir foiz). */
export const PERCENT_SCALE = 100;

/**
 * Yarmini yuqoriga yaxlitlash (round half up).
 *
 * JS'ning `Math.round()` manfiy sonlarda yarmini NOLGA QARAB emas,
 * yuqoriga (+∞ tomon) yaxlitlaydi: Math.round(-2.5) === -2.
 * Qaytarish (vozvrat) va chegirmalarda manfiy summalar uchraydi,
 * shuning uchun o'zimiznikini yozamiz — u nolga nisbatan simmetrik.
 */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Foydalanuvchi kiritgan so'mni (masalan "12000.4") ichki formatga o'tkazadi. */
export function toSum(value: number): Sum {
  return roundHalfUp(value);
}

/** Foydalanuvchi kiritgan miqdorni (masalan 1.5) ichki formatga o'tkazadi. */
export function toQty(value: number): Qty {
  return roundHalfUp(value * QTY_SCALE);
}

/** Ichki miqdorni ko'rsatish uchun oddiy songa o'tkazadi: 1500 → 1.5 */
export function qtyToNumber(qty: Qty): number {
  return qty / QTY_SCALE;
}

/** Foizni ichki formatga: 12.5 → 1250 */
export function toPercent(value: number): number {
  return roundHalfUp(value * PERCENT_SCALE);
}

/**
 * Qator summasi: narx × miqdor.
 *
 * Miqdor mingdan birda bo'lgani uchun 1000 ga bo'linadi va yaxlitlanadi.
 * Masalan: 12000 so'm/kg × 1500 (=1.5 kg) → 18000 so'm.
 */
export function lineAmount(unitPrice: Sum, qty: Qty): Sum {
  return roundHalfUp((unitPrice * qty) / QTY_SCALE);
}

/**
 * Summadan foiz oladi. `percent` yuzdan bir foizda (1250 = 12.5%).
 * Masalan: applyPercent(18000, 1000) → 1800 (10% chegirma summasi).
 */
export function applyPercent(amount: Sum, percent: number): Sum {
  return roundHalfUp((amount * percent) / (100 * PERCENT_SCALE));
}

/**
 * Naqd to'lov uchun yaxlitlash. Do'konda mayda tanga yo'q bo'lsa,
 * jamini eng yaqin `step` ga yaxlitlaydi (masalan step=500).
 * step=1 bo'lsa yaxlitlash yo'q (standart holat).
 */
export function roundCash(amount: Sum, step: number): Sum {
  if (step <= 1) return amount;
  return roundHalfUp(amount / step) * step;
}

/** Ko'rsatish uchun formatlash: 1234567 → "1 234 567" */
export function formatSum(amount: Sum): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(amount).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Miqdorni ko'rsatish: 1500 → "1.5", 2000 → "2" */
export function formatQty(qty: Qty): string {
  const n = qtyToNumber(qty);
  return Number.isInteger(n) ? n.toString() : n.toFixed(3).replace(/0+$/, '');
}
