import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Register, Shift, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { StockService } from '../stock/stock.service';
import { createProduct, createRegister, createUser } from '../test/fixtures';
import { resetDb } from '../test/reset-db';
import type { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

const prisma = new PrismaService();
const shifts = new ShiftsService(prisma);
const stock = new StockService(prisma);
const sales = new SalesService(prisma, shifts, stock);

interface BuildDtoOptions {
  shiftId: string;
  productId: string;
  saleId?: string;
  customerId?: string;
  payments?: { method: 'CASH' | 'CARD' | 'DEBT'; amount: number }[];
}

function buildDto(opts: BuildDtoOptions): CreateSaleDto {
  const saleId = opts.saleId ?? 'sale-1';
  return {
    id: saleId,
    // Har test o'z saleId'sidan farqli raqam olishi uchun — haqiqiy
    // formatga mos kelishi shart emas (parse qilinmasa registerning
    // kuzatuv hisoblagichi shunchaki yangilanmaydi, xato bermaydi).
    number: `T01-${saleId}`,
    shiftId: opts.shiftId,
    customerId: opts.customerId,
    lines: [
      {
        id: 'line-1',
        productId: opts.productId,
        name: 'Test mahsulot',
        unit: 'DONA',
        qty: 2_000,
        unitPrice: 10_000,
        priceType: 'RETAIL',
        costPrice: 6_000,
      },
    ],
    payments: opts.payments ?? [{ method: 'CASH', amount: 20_000 }],
    occurredAt: new Date().toISOString(),
  };
}

describe('SalesService', () => {
  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setup(): Promise<{
    register: Register;
    cashier: User;
    product: Awaited<ReturnType<typeof createProduct>>;
    shift: Shift;
  }> {
    const register = await createRegister(prisma);
    const cashier = await createUser(prisma);
    const product = await createProduct(prisma, { retailPrice: 10_000, costPrice: 6_000 });
    const shift = await shifts.openShift(crypto.randomUUID(), register.id, cashier.id, 0);
    return { register, cashier, product, shift };
  }

  it('savdo yaratadi, qurilma bergan chek raqamini saqlaydi va registerning kuzatuv hisoblagichini yangilaydi', async () => {
    const { product, shift, register, cashier } = await setup();
    const dto = buildDto({ shiftId: shift.id, productId: product.id });
    dto.number = 'T01-000042';

    const sale = await sales.createSale(dto, {
      userId: cashier.id,
      registerId: register.id,
      deviceId: 'device-1',
    });

    expect(sale.totalAmount).toBe(20_000);
    expect(sale.number).toBe('T01-000042');
    expect(await stock.getBalance(product.id)).toBe(-2_000);

    const reloadedRegister = await prisma.register.findUniqueOrThrow({ where: { id: register.id } });
    expect(reloadedRegister.lastReceiptSeq).toBe(42);
  });

  it('bir xil id bilan qayta yuborilsa dublikat yaratmaydi (idempotentlik)', async () => {
    const { product, shift, register, cashier } = await setup();
    const dto = buildDto({ shiftId: shift.id, productId: product.id, saleId: 'sale-idem' });
    const actor = { userId: cashier.id, registerId: register.id, deviceId: 'device-1' };

    const first = await sales.createSale(dto, actor);
    const second = await sales.createSale(dto, actor);

    expect(second.id).toBe(first.id);
    expect(await prisma.sale.count()).toBe(1);
    // Qoldiq faqat BIR marta kamaygan bo'lishi kerak.
    expect(await stock.getBalance(product.id)).toBe(-2_000);
  });

  it('DEBT to‘lov mijoz qarziga (DebtTransaction) yoziladi', async () => {
    const { product, shift, register, cashier } = await setup();
    const customer = await prisma.customer.create({ data: { fullName: 'Mijoz' } });
    const dto = buildDto({
      shiftId: shift.id,
      productId: product.id,
      saleId: 'sale-debt',
      customerId: customer.id,
      payments: [
        { method: 'CASH', amount: 5_000 },
        { method: 'DEBT', amount: 15_000 },
      ],
    });

    await sales.createSale(dto, {
      userId: cashier.id,
      registerId: register.id,
      deviceId: 'device-1',
    });

    const debt = await prisma.debtTransaction.findFirst({ where: { customerId: customer.id } });
    expect(debt?.amount).toBe(15_000);
    expect(debt?.type).toBe('CHARGE');
  });
});
