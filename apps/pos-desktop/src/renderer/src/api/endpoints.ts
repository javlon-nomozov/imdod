import { apiFetch, apiFetchForm, apiFetchWithBearer, getApiBaseUrl } from './client';
import type {
  ImportCommitItem,
  ImportCommitResult,
  ImportRowPreview,
  ImportTemplate,
  Product,
  Sale,
  TokenPair,
} from './types';

/** Qurilma sozlash ekranida — admin login/paroli bilan. */
export function adminLogin(phone: string, password: string): Promise<TokenPair> {
  return apiFetch('/auth/admin/login', { method: 'POST', body: { phone, password }, auth: false });
}

export interface ProvisionDeviceResult {
  registerId: string;
  deviceId: string;
  rawToken: string;
}

/**
 * Yangi kassani serverga ro'yxatdan o'tkazadi va bir martalik xom
 * tokenni qaytaradi. Shu bilan foydalanuvchi hech qanday tokenni qo'lda
 * ko'chirib yozishi shart emas — faqat admin login/paroli kifoya.
 */
export function provisionDevice(
  adminAccessToken: string,
  input: { registerCode: string; registerName: string; deviceName: string },
): Promise<ProvisionDeviceResult> {
  return apiFetchWithBearer('/auth/devices', adminAccessToken, input);
}

export function getSale(id: string): Promise<Sale> {
  return apiFetch(`/sales/${id}`);
}

/** Katalog import ekranida — mos keladigan mavjud mahsulotni qo'lda qidirish (JWT, admin/manager). */
export function searchProducts(search: string): Promise<{ items: Product[]; total: number }> {
  return apiFetch('/products', { query: { search, limit: 20 } });
}

export function getImportTemplate(): Promise<ImportTemplate> {
  return apiFetch('/catalog/import/template');
}

export function importPreviewText(text: string): Promise<ImportRowPreview[]> {
  const form = new FormData();
  form.append('text', text);
  return apiFetchForm('/catalog/import/preview', form);
}

export function importPreviewFile(file: File): Promise<ImportRowPreview[]> {
  const form = new FormData();
  form.append('file', file);
  return apiFetchForm('/catalog/import/preview', form);
}

export function importCommit(items: ImportCommitItem[]): Promise<ImportCommitResult> {
  return apiFetch('/catalog/import/commit', { method: 'POST', body: { items } });
}

/** Eksport — brauzer/asosiy jarayon orqali to'g'ridan-to'g'ri diskka saqlanadi. */
export function exportCatalogUrl(format: 'xlsx' | 'csv'): string {
  return `${getApiBaseUrl()}/catalog/export?format=${format}`;
}
