import { roundCash, type Sum } from './money.js';
import type { PaymentMethod } from './types.js';

export interface PaymentInput {
  method: PaymentMethod;
  amount: Sum;
}

export interface PaymentResult {
  /** To'lanishi kerak bo'lgan summa (naqd yaxlitlashdan keyin). */
  due: Sum;
  /** Naqd yaxlitlash tufayli yuzaga kelgan farq. */
  cashRounding: Sum;
  /** Berilgan to'lovlar yig'indisi. */
  paid: Sum;
  /** Qaytim (faqat naqddan ortiqcha berilgan qismi). */
  change: Sum;
  /** Hali to'lanmagan qism. Nasiya bo'lmasa, bu 0 bo'lishi shart. */
  outstanding: Sum;
}

export interface PaymentOptions {
  /** Naqd to'lovni eng yaqin shu qadamga yaxlitlaydi. 1 = yaxlitlash yo'q. */
  cashRoundingStep?: number;
}

/**
 * Aralash to'lovni hisoblaydi (naqd + karta + nasiya).
 *
 * Muhim: qaytim faqat NAQD to'lovdan berilishi mumkin. Karta orqali
 * ortiqcha "to'lash" mumkin emas — terminal aniq summani yechadi.
 * Shuning uchun ortiqcha qism naqddan hisoblanadi.
 */
export function computePayment(
  total: Sum,
  payments: readonly PaymentInput[],
  options: PaymentOptions = {},
): PaymentResult {
  const step = options.cashRoundingStep ?? 1;

  const cash = sumBy(payments, 'CASH');
  const card = sumBy(payments, 'CARD');
  const debt = sumBy(payments, 'DEBT');

  // Naqd ishtirok etsa va yaxlitlash yoqilgan bo'lsa — jamini yaxlitlaymiz.
  const due = cash > 0 ? roundCash(total, step) : total;
  const cashRounding = due - total;

  const paid = cash + card + debt;
  const nonCashPaid = card + debt;

  // Qaytim: naqd berilgan qism qoplanishi kerak bo'lgan qismdan ortiq bo'lsa.
  const cashNeeded = Math.max(due - nonCashPaid, 0);
  const change = Math.max(cash - cashNeeded, 0);

  const outstanding = Math.max(due - paid, 0);

  return { due, cashRounding, paid, change, outstanding };
}

function sumBy(payments: readonly PaymentInput[], method: PaymentMethod): Sum {
  return payments.reduce((acc, p) => (p.method === method ? acc + p.amount : acc), 0);
}
