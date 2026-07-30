import { useSessionStore } from '../stores/session.store';

// Do'kon haqiqiy Railway'ga deploy qilingan serverni ishlatadi — kassani
// birinchi sozlashda kassir/admin lokal manzil kiritishga majbur
// bo'lmasin. Kerak bo'lsa (lokal test uchun) qurilma sozlash ekranida
// o'zgartirish mumkin.
let apiBaseUrl = 'https://api-production-7438d.up.railway.app';

export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** `Authorization: Bearer` qo'shilsinmi. Standart — ha. */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

// Smena soatlab davom etishi mumkin, access token esa ~15 daqiqada
// tugaydi. Ko'plab so'rovlar bir vaqtda 401 olsa ham, refresh FAQAT
// bir marta yuborilishi kerak — shu promise shuni ta'minlaydi.
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, clearSession } = useSessionStore.getState();
  if (!refreshToken) return false;

  const res = await fetch(new URL('/auth/refresh', apiBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return false;
  }

  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

function refreshOnce(): Promise<boolean> {
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): URL {
  const url = new URL(path, apiBaseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? res.statusText;
}

/**
 * Ba'zi endpointlar (masalan `GET /shifts/current` ochiq smena
 * bo'lmaganda) `null` qaytaradi, lekin server bo'sh tanaga (Content-
 * Length: 0) ega 200 javob beradi — 204 EMAS. Shuning uchun nafaqat
 * 204'ni, balki HAR QANDAY bo'sh tanani xavfsiz qayta ishlash kerak —
 * aks holda `res.json()` "Unexpected end of JSON input" bilan qulaydi.
 */
async function readJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (text.length === 0) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = options;
  const url = buildUrl(path, query);

  const buildHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth) {
      const { accessToken } = useSessionStore.getState();
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const send = (): Promise<Response> =>
    fetch(url, {
      method,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();

  if (res.status === 401 && auth) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await send();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  return readJsonBody<T>(res);
}

/**
 * Qurilma hali sozlanmagan bosqichda (ADMIN login → qurilma provision
 * qilish) doimiy sessiya hali yo'q — shuning uchun bu chaqiruv
 * `useSessionStore`dan emas, to'g'ridan-to'g'ri berilgan tokendan
 * foydalanadi.
 */
export async function apiFetchWithBearer<T>(
  path: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  return readJsonBody<T>(res);
}

/** Fayl/matn yuklash uchun — `multipart/form-data`, JSON emas. */
export async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const url = buildUrl(path);

  const buildHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {};
    const { accessToken } = useSessionStore.getState();
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    return headers;
  };

  const send = (): Promise<Response> =>
    fetch(url, { method: 'POST', headers: buildHeaders(), body: form });

  let res = await send();
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await send();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  return readJsonBody<T>(res);
}
