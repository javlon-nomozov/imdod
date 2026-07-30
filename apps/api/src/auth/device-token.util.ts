import { createHmac, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

/** Yangi qurilma uchun xom token. Faqat provisioning paytida bir marta ko'rinadi. */
export function generateDeviceToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Argon2 emas, HMAC-SHA256 — chunki `Device.tokenHash` bo'yicha qidiruv
 * UNIQUE indeksga tayanadi (O(1)). Argon2 atayin sekin va deterministik
 * emas, shuning uchun bu yerga mos emas: har so'rovda barcha qurilmalarni
 * ketma-ket tekshirishga to'g'ri kelardi.
 */
export function hashDeviceToken(rawToken: string, secret: string): string {
  return createHmac('sha256', secret).update(rawToken).digest('hex');
}
