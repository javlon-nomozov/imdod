import type { PaymentMethod, PriceType, Unit, UserRole } from '@imdod/core';
import { contextBridge, ipcRenderer } from 'electron';

export interface DeviceConfigResult {
  apiBaseUrl: string;
  hasDeviceToken: boolean;
}

export interface SaveFileResult {
  saved: boolean;
  path?: string;
}

export interface LocalBarcode {
  id: string;
  code: string;
  productId: string;
  isPrimary: boolean;
}

export interface LocalProduct {
  id: string;
  nameUz: string;
  nameRu: string;
  unit: Unit;
  categoryId: string | null;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  isActive: boolean;
  barcodes: LocalBarcode[];
}

export type LocalScanOutcome =
  | { kind: 'none'; code: string }
  | { kind: 'single'; code: string; product: LocalProduct }
  | { kind: 'multiple'; code: string; products: LocalProduct[] };

export interface PinLoginResult {
  userId: string;
  fullName: string;
  role: UserRole;
  registerId: string;
}

export interface LocalShift {
  id: string;
  registerId: string;
  openedById: string;
  openedAt: string;
  openingCash: number;
  closedById: string | null;
  closedAt: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  status: 'OPEN' | 'CLOSED';
}

export interface LocalSaleLine {
  id: string;
  saleId: string;
  productId: string;
  nameSnapshot: string;
  unit: Unit;
  qty: number;
  unitPrice: number;
  priceType: PriceType;
  discountPercent: number;
  lineDiscount: number;
  totalAmount: number;
  costPrice: number;
  profit: number;
}

export interface LocalPayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
}

export interface LocalSaleView {
  id: string;
  number: string;
  registerId: string;
  shiftId: string;
  cashierId: string;
  customerId: string | null;
  grossAmount: number;
  lineDiscount: number;
  cartDiscount: number;
  totalAmount: number;
  cashRounding: number;
  profit: number;
  occurredAt: string;
  receivedAt: string;
  lines: LocalSaleLine[];
  payments: LocalPayment[];
}

export interface CreateSalePayload {
  shiftId: string;
  customerId?: string;
  cartDiscount?: { percent?: number; amount?: number };
  lines: {
    id: string;
    productId: string;
    name: string;
    unit: Unit;
    qty: number;
    unitPrice: number;
    priceType: PriceType;
    costPrice: number;
    discountPercent?: number;
  }[];
  payments: { method: PaymentMethod; amount: number }[];
  occurredAt: string;
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

const imdodApi = {
  getConfig: (): Promise<DeviceConfigResult> => ipcRenderer.invoke('config:get'),
  setApiBaseUrl: (url: string): Promise<void> => ipcRenderer.invoke('config:set-api-base-url', url),
  setDeviceToken: (token: string): Promise<void> =>
    ipcRenderer.invoke('config:set-device-token', token),
  clearDeviceToken: (): Promise<void> => ipcRenderer.invoke('config:clear-device-token'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  printPreview: (html: string): Promise<void> => ipcRenderer.invoke('print:preview', html),
  saveFile: (bytes: Uint8Array, suggestedName: string): Promise<SaveFileResult> =>
    ipcRenderer.invoke('file:save', { bytes: Array.from(bytes), suggestedName }),

  // --- Katalog: har doim lokaldan (oflaynda ham ishlaydi) ---
  catalogSearch: (query: string): Promise<LocalProduct[]> =>
    ipcRenderer.invoke('catalog:search', query),
  catalogScan: (code: string): Promise<LocalScanOutcome> => ipcRenderer.invoke('catalog:scan', code),

  // --- Auth: PIN har doim lokal tekshiriladi ---
  hasLocalData: (): Promise<boolean> => ipcRenderer.invoke('sync:has-local-data'),
  pinLogin: (pin: string): Promise<PinLoginResult | null> => ipcRenderer.invoke('auth:pin-login', pin),
  logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),

  // --- Smena ---
  getCurrentShift: (): Promise<LocalShift | null> => ipcRenderer.invoke('shift:get-current'),
  openShift: (openingCash: number): Promise<LocalShift> => ipcRenderer.invoke('shift:open', openingCash),
  closeShift: (closingCash: number): Promise<LocalShift> =>
    ipcRenderer.invoke('shift:close', closingCash),

  // --- Savdo ---
  createSale: (payload: CreateSalePayload): Promise<LocalSaleView> =>
    ipcRenderer.invoke('sale:create', payload),

  // --- Sinxronizatsiya holati ---
  getSyncStatus: (): Promise<SyncStatus> => ipcRenderer.invoke('sync:get-status'),
  runSyncNow: (): Promise<SyncStatus> => ipcRenderer.invoke('sync:run-now'),
  onSyncStatusChange: (callback: (status: SyncStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: SyncStatus) => callback(status);
    ipcRenderer.on('sync:status-changed', listener);
    return () => ipcRenderer.removeListener('sync:status-changed', listener);
  },
};

export type ImdodApi = typeof imdodApi;

contextBridge.exposeInMainWorld('imdod', imdodApi);
