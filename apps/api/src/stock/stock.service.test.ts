import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { createProduct } from '../test/fixtures';
import { resetDb } from '../test/reset-db';
import { StockService } from './stock.service';

const prisma = new PrismaService();
const stock = new StockService(prisma);

describe('StockService', () => {
  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('harakatni yozadi va qoldiqni yangilaydi', async () => {
    const product = await createProduct(prisma);
    await stock.recordMovement({
      id: 'm1',
      productId: product.id,
      type: 'RECEIPT',
      qtyDelta: 5_000,
      occurredAt: new Date(),
    });
    await stock.recordMovement({
      id: 'm2',
      productId: product.id,
      type: 'SALE',
      qtyDelta: -2_000,
      occurredAt: new Date(),
    });

    expect(await stock.getBalance(product.id)).toBe(3_000);
  });

  it('qoldiq manfiyga tushishi mumkin (ikki kassa oxirgi donani sotgan holat)', async () => {
    const product = await createProduct(prisma);
    await stock.recordMovement({
      id: 'm1',
      productId: product.id,
      type: 'SALE',
      qtyDelta: -1_000,
      occurredAt: new Date(),
    });

    expect(await stock.getBalance(product.id)).toBe(-1_000);
  });

  it('recalculateBalance ledger yig‘indisidan to‘g‘ri tiklaydi', async () => {
    const product = await createProduct(prisma);
    await stock.recordMovement({
      id: 'm1',
      productId: product.id,
      type: 'RECEIPT',
      qtyDelta: 10_000,
      occurredAt: new Date(),
    });
    // Keshni qo'lda buzamiz — ta'mirlash to'g'ri ishlashini tekshirish uchun.
    await prisma.stockBalance.update({ where: { productId: product.id }, data: { qty: 999 } });

    const recalculated = await stock.recalculateBalance(product.id);
    expect(recalculated).toBe(10_000);
    expect(await stock.getBalance(product.id)).toBe(10_000);
  });
});
