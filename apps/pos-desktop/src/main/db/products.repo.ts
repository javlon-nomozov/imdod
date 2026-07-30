import type { DatabaseSync } from 'node:sqlite';
import { resolveScan, type ScanOutcome } from '@imdod/core';

export interface LocalBarcode {
  id: string;
  productId: string;
  code: string;
  isPrimary: boolean;
}

export interface LocalProduct {
  id: string;
  nameUz: string;
  nameRu: string;
  unit: string;
  categoryId: string | null;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  isActive: boolean;
  barcodes: LocalBarcode[];
}

export interface LocalCategory {
  id: string;
  nameUz: string;
  nameRu: string;
  parentId: string | null;
  sortOrder: number;
}

interface ProductRow {
  id: string;
  nameUz: string;
  nameRu: string;
  unit: string;
  categoryId: string | null;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  isActive: number;
  updatedAt: string;
}

interface BarcodeRow {
  id: string;
  productId: string;
  code: string;
  isPrimary: number;
}

/**
 * `ChangeLog` orqali kelgan mahsulot/shtrix-kod/kategoriya spravochnigining
 * lokal ko'zgusi. Faqat o'qish uchun (skanerlash, qidiruv) — hech qachon
 * bu yerdan serverga hech narsa yozilmaydi.
 */
export class ProductsRepo {
  constructor(private readonly db: DatabaseSync) {}

  upsertProduct(product: {
    id: string;
    nameUz: string;
    nameRu: string;
    unit: string;
    categoryId: string | null;
    costPrice: number;
    retailPrice: number;
    wholesalePrice: number;
    minStock: number;
    isActive: boolean;
    updatedAt: string;
    barcodes?: { id: string; code: string; isPrimary: boolean }[];
  }): void {
    this.db
      .prepare(
        `INSERT INTO products (id, nameUz, nameRu, unit, categoryId, costPrice, retailPrice, wholesalePrice, minStock, isActive, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nameUz = excluded.nameUz, nameRu = excluded.nameRu, unit = excluded.unit,
           categoryId = excluded.categoryId, costPrice = excluded.costPrice,
           retailPrice = excluded.retailPrice, wholesalePrice = excluded.wholesalePrice,
           minStock = excluded.minStock, isActive = excluded.isActive, updatedAt = excluded.updatedAt`,
      )
      .run(
        product.id,
        product.nameUz,
        product.nameRu,
        product.unit,
        product.categoryId,
        product.costPrice,
        product.retailPrice,
        product.wholesalePrice,
        product.minStock,
        product.isActive ? 1 : 0,
        product.updatedAt,
      );

    if (product.barcodes) {
      this.db.prepare('DELETE FROM barcodes WHERE productId = ?').run(product.id);
      for (const barcode of product.barcodes) {
        this.upsertBarcode({ ...barcode, productId: product.id });
      }
    }
  }

  upsertBarcode(barcode: LocalBarcode): void {
    this.db
      .prepare(
        `INSERT INTO barcodes (id, productId, code, isPrimary) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET productId = excluded.productId, code = excluded.code, isPrimary = excluded.isPrimary`,
      )
      .run(barcode.id, barcode.productId, barcode.code, barcode.isPrimary ? 1 : 0);
  }

  deleteBarcode(id: string): void {
    this.db.prepare('DELETE FROM barcodes WHERE id = ?').run(id);
  }

  upsertCategory(category: LocalCategory): void {
    this.db
      .prepare(
        `INSERT INTO categories (id, nameUz, nameRu, parentId, sortOrder) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET nameUz = excluded.nameUz, nameRu = excluded.nameRu,
           parentId = excluded.parentId, sortOrder = excluded.sortOrder`,
      )
      .run(category.id, category.nameUz, category.nameRu, category.parentId, category.sortOrder);
  }

  deleteCategory(id: string): void {
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }

  private toProduct(row: ProductRow, barcodes: BarcodeRow[]): LocalProduct {
    return {
      id: row.id,
      nameUz: row.nameUz,
      nameRu: row.nameRu,
      unit: row.unit,
      categoryId: row.categoryId,
      costPrice: row.costPrice,
      retailPrice: row.retailPrice,
      wholesalePrice: row.wholesalePrice,
      minStock: row.minStock,
      isActive: row.isActive === 1,
      barcodes: barcodes
        .filter((b) => b.productId === row.id)
        .map((b) => ({ id: b.id, productId: b.productId, code: b.code, isPrimary: b.isPrimary === 1 })),
    };
  }

  private attachBarcodes(products: ProductRow[]): LocalProduct[] {
    if (products.length === 0) return [];
    const placeholders = products.map(() => '?').join(',');
    const barcodes = this.db
      .prepare(`SELECT * FROM barcodes WHERE productId IN (${placeholders})`)
      .all(...products.map((p) => p.id)) as unknown as BarcodeRow[];
    return products.map((p) => this.toProduct(p, barcodes));
  }

  search(query: string, limit = 20): LocalProduct[] {
    const like = `%${query}%`;
    const rows = this.db
      .prepare(
        `SELECT * FROM products WHERE isActive = 1 AND (nameUz LIKE ? OR nameRu LIKE ?) ORDER BY nameUz ASC LIMIT ?`,
      )
      .all(like, like, limit) as unknown as ProductRow[];
    return this.attachBarcodes(rows);
  }

  findByCode(code: string): ScanOutcome<LocalProduct> {
    const trimmed = code.trim();
    const rows = this.db
      .prepare(
        `SELECT p.* FROM products p
         JOIN barcodes b ON b.productId = p.id
         WHERE b.code = ? AND p.isActive = 1`,
      )
      .all(trimmed) as unknown as ProductRow[];
    return resolveScan(trimmed, this.attachBarcodes(rows));
  }
}
