import type { Sum, Qty } from './money.js';

/** O'lchov birligi. Kasrli miqdor faqat KG va METR uchun mantiqiy. */
export const UNITS = ['DONA', 'KG', 'METR', 'KOMPLEKT', 'UPAKOVKA'] as const;
export type Unit = (typeof UNITS)[number];

/** Qaysi birliklarda kasrli miqdor kiritish mumkin. */
export const FRACTIONAL_UNITS: ReadonlySet<Unit> = new Set<Unit>(['KG', 'METR']);

export function allowsFractionalQty(unit: Unit): boolean {
  return FRACTIONAL_UNITS.has(unit);
}

/** Narx turi: dona narx yoki optom narx. */
export const PRICE_TYPES = ['RETAIL', 'WHOLESALE'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

/**
 * To'lov usuli.
 * CARD — terminal ALOHIDA ishlaydi, tizim to'lovda qatnashmaydi,
 *        faqat "karta orqali to'landi" deb qayd etadi.
 * DEBT — nasiya, mijozning qarziga yoziladi.
 */
export const PAYMENT_METHODS = ['CASH', 'CARD', 'DEBT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Ombor harakati turi. Qoldiq — shu harakatlar yig'indisi. */
export const STOCK_MOVEMENT_TYPES = [
  'RECEIPT', // ta'minotchidan kirim
  'SALE', // sotildi
  'RETURN', // mijoz qaytardi
  'WRITE_OFF', // hisobdan chiqarildi (buzilgan, yo'qolgan)
  'ADJUSTMENT', // inventarizatsiya natijasida tuzatish
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** Foydalanuvchi roli. */
export const USER_ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'STOCKKEEPER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Onlayn zakaz holati. POS'ga hech qanday aloqasi yo'q. */
export const PREORDER_STATUSES = ['NEW', 'IN_PROGRESS', 'READY', 'DONE', 'CANCELLED'] as const;
export type PreOrderStatus = (typeof PREORDER_STATUSES)[number];

/** Savatdagi bitta qator (hisoblashdan oldingi holat). */
export interface CartLineInput {
  /** Qurilmada generatsiya qilingan barqaror ID (offline uchun). */
  id: string;
  productId: string;
  /** Chek va tarix uchun nom nusxasi — mahsulot nomi keyin o'zgarsa ham chek buzilmaydi. */
  name: string;
  unit: Unit;
  qty: Qty;
  unitPrice: Sum;
  priceType: PriceType;
  /** Tan narxi nusxasi — foyda hisobi uchun. */
  costPrice: Sum;
  /** Qator chegirmasi, yuzdan bir foizda (1250 = 12.5%). */
  discountPercent?: number;
}

/** Hisoblangan qator. */
export interface CartLine extends CartLineInput {
  /** narx × miqdor (chegirmasiz) */
  gross: Sum;
  /** qator chegirmasi summasi */
  lineDiscount: Sum;
  /** chegirmadan keyin, savat chegirmasi taqsimlanishidan oldin */
  net: Sum;
  /** savat chegirmasidan ham keyingi yakuniy summa */
  total: Sum;
  /** shu qator bo'yicha foyda */
  profit: Sum;
}

export interface CartTotals {
  /** barcha qatorlarning chegirmasiz yig'indisi */
  gross: Sum;
  /** qator chegirmalari yig'indisi */
  lineDiscount: Sum;
  /** savat darajasidagi chegirma */
  cartDiscount: Sum;
  /** barcha chegirmalar yig'indisi */
  totalDiscount: Sum;
  /** to'lanishi kerak bo'lgan summa */
  total: Sum;
  /** umumiy foyda */
  profit: Sum;
}

export interface Cart {
  lines: CartLine[];
  totals: CartTotals;
}
