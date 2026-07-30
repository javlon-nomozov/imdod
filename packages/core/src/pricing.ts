import type { Sum } from './money.js';
import type { PriceType } from './types.js';

export interface ProductPrices {
  retailPrice: Sum;
  wholesalePrice: Sum;
}

export interface PriceContext {
  /** Mijoz optom sifatida tasdiqlanganmi (admin panelda belgilanadi). */
  isWholesale?: boolean;
  /** Kassir qo'lda optom narxni tanlaganmi. */
  forcePriceType?: PriceType;
}

/**
 * Qaysi narx qo'llanishini aniqlaydi.
 *
 * Qoida: optom narx faqat admin panelda `isWholesale` deb belgilangan
 * mijozga beriladi. Kassir qo'lda ham tanlashi mumkin (ruxsati bo'lsa) —
 * shuning uchun `forcePriceType` ustunlik qiladi.
 *
 * Agar optom narx belgilanmagan bo'lsa (0), dona narxga qaytamiz —
 * aks holda tovar bepulga ketib qoladi.
 */
export function resolvePrice(
  prices: ProductPrices,
  context: PriceContext = {},
): { priceType: PriceType; unitPrice: Sum } {
  const wantsWholesale = context.forcePriceType
    ? context.forcePriceType === 'WHOLESALE'
    : Boolean(context.isWholesale);

  if (wantsWholesale && prices.wholesalePrice > 0) {
    return { priceType: 'WHOLESALE', unitPrice: prices.wholesalePrice };
  }

  return { priceType: 'RETAIL', unitPrice: prices.retailPrice };
}

/**
 * Sotuv zarar bilan ketayotganini tekshiradi.
 * Kassirga ogohlantirish ko'rsatish uchun — taqiqlash uchun emas,
 * chunki ba'zan aksiya yoki eskirgan tovar ataylab zararga sotiladi.
 */
export function isBelowCost(unitPrice: Sum, costPrice: Sum): boolean {
  return costPrice > 0 && unitPrice < costPrice;
}
