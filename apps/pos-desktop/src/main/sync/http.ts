export interface SyncHttpConfig {
  apiBaseUrl: string;
  deviceToken: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

export class SyncApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface SyncFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number>;
}

/**
 * `/sync/*` uchun fetch — renderer'ning `api/client.ts`dan mustaqil,
 * chunki bu yerda JWT/refresh mantig'i umuman yo'q: yagona autentifikatsiya
 * `x-device-token`.
 */
export async function syncFetch<T>(
  config: SyncHttpConfig,
  path: string,
  options: SyncFetchOptions = {},
): Promise<T> {
  const url = new URL(path, config.apiBaseUrl);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-device-token': config.deviceToken,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = res.statusText;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // Body JSON emas — statusText bilan qolamiz.
    }
    throw new SyncApiError(res.status, message);
  }

  const text = await res.text();
  return text.length === 0 ? (undefined as T) : (JSON.parse(text) as T);
}
