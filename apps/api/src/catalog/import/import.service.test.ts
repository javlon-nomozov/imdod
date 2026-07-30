import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../../stock/stock.service';
import { createProduct } from '../../test/fixtures';
import { resetDb } from '../../test/reset-db';
import type { ImportCommitItemDto } from './dto/import-commit-item.dto';
import { ImportService } from './import.service';
import type { ParsedRow } from './parse.service';

const prisma = new PrismaService();
const stock = new StockService(prisma);
const importService = new ImportService(prisma, stock);

const USER_ID_PLACEHOLDER = 'seed-user';

describe('ImportService', () => {
  beforeEach(async () => {
    await resetDb(prisma);
    // FK: DebtTransaction/StockMovement userId ixtiyoriy, lekin haqiqiy
    // foydalanuvchi bilan sinash uchun bittasini yaratamiz.
    await prisma.user.create({
      data: { id: USER_ID_PLACEHOLDER, fullName: 'Import test', role: 'ADMIN', pinHash: 'x' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('preview: noto‘g‘ri o‘lchov birligi xato sifatida qaytadi', async () => {
    const rows: ParsedRow[] = [
      {
        rowNumber: 2,
        nameUz: 'Test mahsulot',
        unit: 'NOMATCH',
        costPrice: 1000,
        retailPrice: 2000,
        barcodes: [],
      },
    ];

    const preview = await importService.preview(rows);
    expect(preview[0]?.parsed).toBeNull();
    expect(preview[0]?.errors.length).toBeGreaterThan(0);
  });

  it('preview: mavjud mahsulotga o‘xshash nomni taklif qiladi (kirill/lotin)', async () => {
    const existing = await createProduct(prisma, { retailPrice: 5000, costPrice: 3000 });
    await prisma.product.update({
      where: { id: existing.id },
      data: { nameUz: 'Daftar 48 varaq', nameRu: 'Тетрадь 48 листов' },
    });

    const rows: ParsedRow[] = [
      {
        rowNumber: 2,
        nameUz: 'Дафтар 48 варак',
        unit: 'DONA',
        costPrice: 3000,
        retailPrice: 5000,
        barcodes: [],
      },
    ];

    const preview = await importService.preview(rows);
    expect(preview[0]?.suggestions.length).toBeGreaterThan(0);
    expect(preview[0]?.suggestions[0]?.nameUz).toBe('Daftar 48 varaq');
  });

  it('commit "create": yangi mahsulot, shtrix-kod va kirim yaratadi', async () => {
    const item: ImportCommitItemDto = {
      action: 'create',
      rowNumber: 2,
      nameUz: 'Yangi mahsulot',
      nameRu: 'Новый товар',
      unit: 'DONA',
      costPrice: 1000,
      retailPrice: 2000,
      barcodes: ['1111111111111'],
      qty: 5000,
    };

    const result = await importService.commit([item], USER_ID_PLACEHOLDER);
    expect(result).toEqual({ created: 1, merged: 0, skipped: 0 });

    const product = await prisma.product.findFirstOrThrow({ where: { nameUz: 'Yangi mahsulot' } });
    expect(await stock.getBalance(product.id)).toBe(5000);
    const barcode = await prisma.barcode.findFirst({ where: { productId: product.id } });
    expect(barcode?.code).toBe('1111111111111');
  });

  it('commit "merge": eski nomni saqlaydi, faqat miqdor qo‘shadi', async () => {
    const existing = await createProduct(prisma, { retailPrice: 5000, costPrice: 3000 });
    await prisma.product.update({ where: { id: existing.id }, data: { nameUz: 'Eski nom' } });

    const item: ImportCommitItemDto = {
      action: 'merge',
      rowNumber: 3,
      productId: existing.id,
      qty: 2000,
      barcodes: ['2222222222222'],
    };

    const result = await importService.commit([item], USER_ID_PLACEHOLDER);
    expect(result).toEqual({ created: 0, merged: 1, skipped: 0 });

    const reloaded = await prisma.product.findUniqueOrThrow({ where: { id: existing.id } });
    expect(reloaded.nameUz).toBe('Eski nom');
    expect(await stock.getBalance(existing.id)).toBe(2000);
    const barcode = await prisma.barcode.findFirst({ where: { productId: existing.id } });
    expect(barcode?.code).toBe('2222222222222');
  });

  it('commit "skip": hech narsa o‘zgartirmaydi', async () => {
    const result = await importService.commit(
      [{ action: 'skip', rowNumber: 4 }],
      USER_ID_PLACEHOLDER,
    );
    expect(result).toEqual({ created: 0, merged: 0, skipped: 1 });
  });
});
