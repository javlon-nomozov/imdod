/**
 * Chek raqami.
 *
 * Muammo: 5-6 kassa offline ishlaganda hech biri "keyingi raqam nechchi"
 * degan savolga serverdan javob ololmaydi. Agar hammasi 1 dan boshlasa,
 * sinxronizatsiyada raqamlar to'qnashadi.
 *
 * Yechim: har chek raqami qurilma prefiksi bilan boshlanadi.
 * Har bir kassa o'z ketma-ketligini yuritadi va boshqalarga aralashmaydi.
 *
 *   K01-000042  → 1-kassaning 42-cheki
 *   K03-000007  → 3-kassaning 7-cheki
 *
 * Server tomonda buxgalteriya uchun alohida global ketma-ketlik yuritiladi,
 * lekin mijozga ko'rinadigan va qidiriladigan raqam — mana shu.
 */

export const RECEIPT_SEQ_PADDING = 6;

export function formatReceiptNumber(registerCode: string, seq: number): string {
  return `${registerCode}-${seq.toString().padStart(RECEIPT_SEQ_PADDING, '0')}`;
}

export interface ParsedReceiptNumber {
  registerCode: string;
  seq: number;
}

export function parseReceiptNumber(value: string): ParsedReceiptNumber | null {
  const match = /^([A-Z0-9]+)-(\d+)$/.exec(value.trim().toUpperCase());
  if (!match) return null;
  const registerCode = match[1];
  const seqText = match[2];
  if (!registerCode || !seqText) return null;
  return { registerCode, seq: Number.parseInt(seqText, 10) };
}

/** Kassa kodi to'g'ri formatdami: K01, K02, ... */
export function isValidRegisterCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{1,7}$/.test(code);
}
