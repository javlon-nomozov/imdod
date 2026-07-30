import { type PaymentMethod } from './types.js';
import { computePayment } from './payment.js';
import type { Sum } from './money.js';

export interface ExpectedCashSale {
  totalAmount: Sum;
  payments: { method: PaymentMethod; amount: Sum }[];
}

/**
 * Smena yopilganda kassada bo'lishi kerak bo'lgan naqd summa.
 *
 * Bu hisob-kitob ikki joyda ishlatiladi: API'da (online smena yopish) va
 * Electron main-process'da (oflayn smena yopish, lokal savdolar bo'yicha)
 * — shuning uchun bir marta shu yerda yoziladi, ikkalasida bir xil natija
 * chiqishi kafolatlanadi.
 *
 * `change` hech qayerda saqlanmaydi — har safar `computePayment` orqali
 * qayta hisoblanadi. Bilib turilgan cheklov: qaytarishlar (`SaleReturn`)
 * hisobga olinmaydi (hali yaratish funksiyasi yo'q). `DEBT` to'lovlari
 * naqdga umuman ta'sir qilmaydi (to'g'ri chiqarib tashlangan).
 */
export function computeExpectedCash(openingCash: Sum, sales: ExpectedCashSale[]): Sum {
  let cashNet = 0;
  for (const sale of sales) {
    const payment = computePayment(sale.totalAmount, sale.payments);
    const cashPaid = sale.payments
      .filter((p) => p.method === 'CASH')
      .reduce((acc, p) => acc + p.amount, 0);
    cashNet += cashPaid - payment.change;
  }
  return openingCash + cashNet;
}
