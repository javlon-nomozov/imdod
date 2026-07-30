import type { PaymentMethod, PriceType, ScanOutcome, Unit } from '@imdod/core';

export interface Barcode {
  id: string;
  code: string;
  productId: string;
  isPrimary: boolean;
}

export interface Product {
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
  barcodes: Barcode[];
}

export type ProductScanOutcome = ScanOutcome<Product>;

export interface Shift {
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

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
}

export interface SaleLine {
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

export interface Sale {
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
  lines: SaleLine[];
  payments: Payment[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ImportSuggestion {
  productId: string;
  nameUz: string;
  nameRu: string;
  score: number;
}

export interface ImportRowParsed {
  rowNumber: number;
  nameUz: string;
  nameRu?: string;
  unit: Unit;
  categoryName?: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice?: number;
  barcodes: string[];
  qty?: number;
}

export interface ImportRowPreview {
  rowNumber: number;
  parsed: ImportRowParsed | null;
  errors: string[];
  suggestions: ImportSuggestion[];
}

export type ImportCommitItem =
  | ({ action: 'create' } & ImportRowParsed)
  | {
      action: 'merge';
      rowNumber: number;
      productId: string;
      qty?: number;
      unitCost?: number;
      barcodes?: string[];
    }
  | { action: 'skip'; rowNumber: number };

export interface ImportCommitResult {
  created: number;
  merged: number;
  skipped: number;
}

export interface ImportTemplateColumn {
  key: string;
  label: string;
  required: boolean;
}

export interface ImportTemplate {
  columns: ImportTemplateColumn[];
  promptUz: string;
  exampleRows: string[][];
}
