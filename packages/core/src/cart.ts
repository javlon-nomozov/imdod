import { applyPercent, lineAmount, type Sum } from './money.js';
import type { Cart, CartLine, CartLineInput, CartTotals } from './types.js';

export interface CartDiscount {
  /** Savat darajasidagi foiz chegirmasi (1250 = 12.5%). */
  percent?: number;
  /** Yoki aniq summa chegirmasi. Ikkalasi berilsa foiz avval qo'llanadi. */
  amount?: Sum;
}

/**
 * Savatni hisoblaydi.
 *
 * Tartib muhim:
 *   1. Har qator: narx × miqdor → qator chegirmasi ayiriladi
 *   2. Savat chegirmasi qolgan summadan olinadi
 *   3. Savat chegirmasi qatorlarga PROPORSIONAL taqsimlanadi
 *
 * 3-qadam nega kerak? Foyda hisoboti va qaytarish (vozvrat) qator darajasida
 * ishlaydi. Agar savat chegirmasi qatorlarga taqsimlanmasa, bitta qatorni
 * qaytarganda qancha pul qaytarishni bilib bo'lmaydi.
 *
 * Taqsimlashda yaxlitlash xatosi to'planmasligi uchun "eng katta qoldiq"
 * usuli ishlatiladi — qatorlar yig'indisi HAR DOIM aniq savat jamiga teng.
 */
export function computeCart(inputs: CartLineInput[], discount: CartDiscount = {}): Cart {
  // --- 1-qadam: qatorlar ---
  const base = inputs.map((input) => {
    const gross = lineAmount(input.unitPrice, input.qty);
    const lineDiscount = input.discountPercent ? applyPercent(gross, input.discountPercent) : 0;
    return { input, gross, lineDiscount, net: gross - lineDiscount };
  });

  const grossTotal = sumOf(base, (l) => l.gross);
  const lineDiscountTotal = sumOf(base, (l) => l.lineDiscount);
  const netTotal = grossTotal - lineDiscountTotal;

  // --- 2-qadam: savat chegirmasi ---
  let cartDiscount = 0;
  if (discount.percent) cartDiscount += applyPercent(netTotal, discount.percent);
  if (discount.amount) cartDiscount += discount.amount;
  // Chegirma jamidan oshib ketmasin (manfiy chek bo'lib qolmasin).
  cartDiscount = Math.min(Math.max(cartDiscount, 0), Math.max(netTotal, 0));

  // --- 3-qadam: taqsimlash ---
  const shares = distribute(
    cartDiscount,
    base.map((l) => l.net),
  );

  const lines: CartLine[] = base.map((l, i) => {
    const share = shares[i] ?? 0;
    const total = l.net - share;
    const cost = lineAmount(l.input.costPrice, l.input.qty);
    return {
      ...l.input,
      gross: l.gross,
      lineDiscount: l.lineDiscount,
      net: l.net,
      total,
      profit: total - cost,
    };
  });

  const totals: CartTotals = {
    gross: grossTotal,
    lineDiscount: lineDiscountTotal,
    cartDiscount,
    totalDiscount: lineDiscountTotal + cartDiscount,
    total: netTotal - cartDiscount,
    profit: sumOf(lines, (l) => l.profit),
  };

  return { lines, totals };
}

/**
 * `amount` ni `weights` bo'yicha proporsional taqsimlaydi.
 * Natija butun sonlardan iborat va yig'indisi ANIQ `amount` ga teng.
 *
 * Usul: avval pastga yaxlitlab beramiz, so'ng qolgan tiyinlarni
 * kasr qismi eng katta bo'lgan qatorlarga bittadan tarqatamiz.
 */
export function distribute(amount: Sum, weights: readonly Sum[]): Sum[] {
  const result = new Array<Sum>(weights.length).fill(0);
  if (amount === 0 || weights.length === 0) return result;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    // Og'irliklar yig'indisi nol bo'lsa (masalan hammasi bepul) —
    // taqsimlashga asos yo'q, hammasini birinchi qatorga yozamiz.
    result[0] = amount;
    return result;
  }

  const remainders: { index: number; frac: number }[] = [];
  let allocated = 0;

  for (let i = 0; i < weights.length; i++) {
    const exact = (amount * (weights[i] ?? 0)) / totalWeight;
    const floored = Math.floor(exact);
    result[i] = floored;
    allocated += floored;
    remainders.push({ index: i, frac: exact - floored });
  }

  // Qolgan farqni eng katta kasr qismidan boshlab tarqatamiz.
  let remaining = amount - allocated;
  remainders.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainders.length && remaining > 0; i++) {
    const idx = remainders[i]?.index;
    if (idx === undefined) continue;
    result[idx] = (result[idx] ?? 0) + 1;
    remaining--;
  }

  return result;
}

function sumOf<T>(items: readonly T[], pick: (item: T) => Sum): Sum {
  return items.reduce((acc, item) => acc + pick(item), 0);
}
