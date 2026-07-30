const HEALTH_CHECK_TIMEOUT_MS = 5_000;

/**
 * `/health` faqat API tirikligini emas — bazaga ham ulanishni tekshiradi
 * (`HealthController`). Shuning uchun bu qurilmaning "onlaynmi" degan
 * yagona ishonchli manbai: tarmoq bor-u server/baza o'lik bo'lsa ham
 * oflayn deb hisoblanadi.
 */
export async function checkOnline(apiBaseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/health', apiBaseUrl), {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
