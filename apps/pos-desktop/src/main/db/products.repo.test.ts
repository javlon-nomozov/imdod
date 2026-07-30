import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { ProductsRepo } from './products.repo';

describe('ProductsRepo', () => {
  let db: DatabaseSync;
  let repo: ProductsRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new ProductsRepo(db);
  });

  it('mahsulotni shtrix-kodlari bilan saqlaydi va qayta yozganda almashtiradi', () => {
    repo.upsertProduct({
      id: 'p1',
      nameUz: 'Daftar',
      nameRu: 'Тетрадь',
      unit: 'DONA',
      categoryId: null,
      costPrice: 1000,
      retailPrice: 2000,
      wholesalePrice: 0,
      minStock: 0,
      isActive: true,
      updatedAt: new Date().toISOString(),
      barcodes: [{ id: 'b1', code: '111', isPrimary: true }],
    });

    const found = repo.findByCode('111');
    expect(found.kind).toBe('single');
    if (found.kind === 'single') {
      expect(found.product.nameUz).toBe('Daftar');
      expect(found.product.barcodes).toHaveLength(1);
    }

    // Qayta yozish — barcodes ro'yxati YANGISI bilan almashadi (eskisi qolmaydi).
    repo.upsertProduct({
      id: 'p1',
      nameUz: 'Daftar (yangilangan)',
      nameRu: 'Тетрадь',
      unit: 'DONA',
      categoryId: null,
      costPrice: 1000,
      retailPrice: 2500,
      wholesalePrice: 0,
      minStock: 0,
      isActive: true,
      updatedAt: new Date().toISOString(),
      barcodes: [{ id: 'b2', code: '222', isPrimary: true }],
    });

    expect(repo.findByCode('111').kind).toBe('none');
    const updated = repo.findByCode('222');
    expect(updated.kind).toBe('single');
    if (updated.kind === 'single') {
      expect(updated.product.retailPrice).toBe(2500);
    }
  });

  it('bitta kod bir nechta mahsulotga tegishli bo‘lsa "multiple" qaytaradi', () => {
    for (const id of ['p1', 'p2']) {
      repo.upsertProduct({
        id,
        nameUz: `Mahsulot ${id}`,
        nameRu: `Товар ${id}`,
        unit: 'DONA',
        categoryId: null,
        costPrice: 1000,
        retailPrice: 2000,
        wholesalePrice: 0,
        minStock: 0,
        isActive: true,
        updatedAt: new Date().toISOString(),
        barcodes: [{ id: `b-${id}`, code: 'SHARED', isPrimary: true }],
      });
    }

    const outcome = repo.findByCode('SHARED');
    expect(outcome.kind).toBe('multiple');
    if (outcome.kind === 'multiple') {
      expect(outcome.products).toHaveLength(2);
    }
  });

  it('nofaol mahsulotlar qidiruv/skanerlashda ko‘rinmaydi', () => {
    repo.upsertProduct({
      id: 'p1',
      nameUz: 'Eskirgan',
      nameRu: 'Старый',
      unit: 'DONA',
      categoryId: null,
      costPrice: 1000,
      retailPrice: 2000,
      wholesalePrice: 0,
      minStock: 0,
      isActive: false,
      updatedAt: new Date().toISOString(),
      barcodes: [{ id: 'b1', code: '999', isPrimary: true }],
    });

    expect(repo.findByCode('999').kind).toBe('none');
    expect(repo.search('Eskirgan')).toHaveLength(0);
  });

  it('qidiruv nomi bo‘yicha (uz yoki ru) topadi', () => {
    repo.upsertProduct({
      id: 'p1',
      nameUz: 'Ruchka',
      nameRu: 'Ручка',
      unit: 'DONA',
      categoryId: null,
      costPrice: 500,
      retailPrice: 1000,
      wholesalePrice: 0,
      minStock: 0,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });

    expect(repo.search('Ruchka')).toHaveLength(1);
    expect(repo.search('Ручка')).toHaveLength(1);
    expect(repo.search('yo‘q-narsa')).toHaveLength(0);
  });
});
