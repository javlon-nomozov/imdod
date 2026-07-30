import type { Unit } from '@imdod/core';

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

export interface ImportSuggestion {
  productId: string;
  nameUz: string;
  nameRu: string;
  score: number;
}

export interface ImportRowPreview {
  rowNumber: number;
  /** Validatsiyadan o'tmasa `null` — `errors` sababini tushuntiradi. */
  parsed: ImportRowParsed | null;
  errors: string[];
  suggestions: ImportSuggestion[];
}

export interface ImportCommitResult {
  created: number;
  merged: number;
  skipped: number;
}
