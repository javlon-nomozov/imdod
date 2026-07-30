import type { CartDiscount, PaymentMethod, PriceType, Unit } from '@imdod/core';
import { apiFetch, apiFetchForm, apiFetchWithBearer, getApiBaseUrl } from './client';
import type {
  ImportCommitItem,
  ImportCommitResult,
  ImportRowPreview,
  ImportTemplate,
  Product,
  ProductScanOutcome,
  Sale,
  Shift,
  TokenPair,
} from './types';

export function posLogin(pin: string): Promise<TokenPair> {
  return apiFetch('/auth/pos/login', { method: 'POST', body: { pin }, auth: false, device: true });
}

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

export function scanBarcode(code: string): Promise<ProductScanOutcome> {
  return apiFetch('/catalog/scan', { query: { code } });
}

export function searchProducts(search: string): Promise<{ items: Product[]; total: number }> {
  return apiFetch('/products', { query: { search, limit: 20 } });
}

export function getStockBalance(productId: string): Promise<{ productId: string; qty: number }> {
  return apiFetch(`/stock/balance/${productId}`);
}

export function openShift(registerId: string, openingCash: number): Promise<Shift> {
  return apiFetch('/shifts/open', { method: 'POST', body: { registerId, openingCash } });
}

export function closeShift(shiftId: string, closingCash: number): Promise<Shift> {
  return apiFetch(`/shifts/${shiftId}/close`, { method: 'POST', body: { closingCash } });
}

export function getCurrentShift(registerId: string): Promise<Shift | null> {
  return apiFetch('/shifts/current', { query: { registerId } });
}

export interface CreateSaleLinePayload {
  id: string;
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  unitPrice: number;
  priceType: PriceType;
  costPrice: number;
  discountPercent?: number;
}

export interface CreateSalePayload {
  id: string;
  shiftId: string;
  customerId?: string;
  cartDiscount?: CartDiscount;
  lines: CreateSaleLinePayload[];
  payments: { method: PaymentMethod; amount: number }[];
  occurredAt: string;
}

export function createSale(payload: CreateSalePayload): Promise<Sale> {
  return apiFetch('/sales', { method: 'POST', body: payload, device: true });
}

export function getSale(id: string): Promise<Sale> {
  return apiFetch(`/sales/${id}`);
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
