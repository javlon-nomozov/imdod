import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ChangeLogService } from '../../change-log/change-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { resetDb } from '../../test/reset-db';
import { ProductsService } from './products.service';

const prisma = new PrismaService();
const changeLog = new ChangeLogService(prisma);
const products = new ProductsService(prisma, changeLog);

describe('ProductsService', () => {
  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('yaratishda ChangeLog yozuvi qo‘shadi (POS qurilmalari shundan tortib oladi)', async () => {
    const product = await products.create({
      nameUz: 'Daftar',
      nameRu: 'Тетрадь',
      unit: 'DONA',
      costPrice: 1000,
      retailPrice: 2000,
    });

    const entries = await prisma.changeLog.findMany({ where: { entity: 'Product', entityId: product.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.op).toBe('UPSERT');
    expect((entries[0]?.payload as { nameUz?: string } | null)?.nameUz).toBe('Daftar');
  });

  it('yangilashda yana bitta ChangeLog yozuvi qo‘shadi', async () => {
    const product = await products.create({
      nameUz: 'Daftar',
      nameRu: 'Тетрадь',
      unit: 'DONA',
      costPrice: 1000,
      retailPrice: 2000,
    });

    await products.update(product.id, { retailPrice: 2500 });

    const entries = await prisma.changeLog.findMany({
      where: { entity: 'Product', entityId: product.id },
      orderBy: { seq: 'asc' },
    });
    expect(entries).toHaveLength(2);
    expect((entries[1]?.payload as { retailPrice?: number } | null)?.retailPrice).toBe(2500);
  });

  it('yumshoq o‘chirishda UPSERT (isActive:false) yozadi, DELETE emas', async () => {
    const product = await products.create({
      nameUz: 'Daftar',
      nameRu: 'Тетрадь',
      unit: 'DONA',
      costPrice: 1000,
      retailPrice: 2000,
    });

    await products.softDelete(product.id);

    const entries = await prisma.changeLog.findMany({
      where: { entity: 'Product', entityId: product.id },
      orderBy: { seq: 'asc' },
    });
    expect(entries).toHaveLength(2);
    expect(entries[1]?.op).toBe('UPSERT');
    expect((entries[1]?.payload as { isActive?: boolean } | null)?.isActive).toBe(false);
  });
});
