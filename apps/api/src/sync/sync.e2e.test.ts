import type { INestApplication } from '@nestjs/common';
import type { SyncChangesResponse, SyncRegisterSnapshot, SyncUserSnapshot } from '@imdod/sync';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductsService } from '../catalog/products/products.service';
import { PrismaService } from '../prisma/prisma.service';
import { createDevice, createProduct, createRegister, createUser } from '../test/fixtures';
import { resetDb } from '../test/reset-db';
import { createTestApp } from '../test/test-app';

/**
 * `/sync/*` — faqat `DeviceGuard`. JWT yo'q, shuning uchun bu yerda ikkita
 * narsa alohida sinaladi: (1) qurilma tokeni haqiqatan yagona himoya
 * ekanligi, (2) `cashierId`/`openedById`/`closedById` orqali kelgan
 * "kim ekanligi" da'vosi faol foydalanuvchiga tekshirilishi.
 */
describe('Sync HTTP oqimi', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let rawToken: string;
  let registerId: string;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDb(prisma);
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;

    const secret = process.env.DEVICE_TOKEN_SECRET;
    if (!secret) throw new Error('DEVICE_TOKEN_SECRET .env faylida yo‘q');
    const register = await createRegister(prisma);
    registerId = register.id;
    const { rawToken: token } = await createDevice(prisma, register.id, secret);
    rawToken = token;
  });

  afterEach(async () => {
    await app.close();
  });

  function deviceHeaders(): Record<string, string> {
    return { 'content-type': 'application/json', 'x-device-token': rawToken };
  }

  it('qurilma tokenisiz har qanday /sync endpointi 401 qaytaradi', async () => {
    const res = await fetch(`${baseUrl}/sync/register`);
    expect(res.status).toBe(401);
  });

  it('GET /sync/register — kassaning joriy holatini qaytaradi', async () => {
    const res = await fetch(`${baseUrl}/sync/register`, { headers: deviceHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SyncRegisterSnapshot;
    expect(body.id).toBe(registerId);
    expect(body.lastReceiptSeq).toBe(0);
  });

  it('GET /sync/users — faqat faol foydalanuvchilarni pinHash bilan qaytaradi', async () => {
    const active = await createUser(prisma, { pin: '1111' });
    await prisma.user.update({
      where: { id: (await createUser(prisma, { pin: '2222' })).id },
      data: { isActive: false },
    });

    const res = await fetch(`${baseUrl}/sync/users`, { headers: deviceHeaders() });
    const body = (await res.json()) as SyncUserSnapshot[];
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe(active.id);
    expect(body[0]?.pinHash).toBeTruthy();
  });

  it('GET /sync/changes?since=0 — to‘liq snapshot qaytaradi, keyin faqat o‘zgarishlar', async () => {
    // `ProductsService` orqali (fixture'dagi xom `prisma.product.create`dan
    // farqli) — chunki u ChangeLog yozuvini ham baravar yozadi, aynan
    // haqiqiy ilovadagi kabi. Aks holda snapshot cursori 0 bo'lib qolib,
    // keyingi so'rov yana "birinchi sinxronizatsiya" deb talqin qilinadi.
    const products = app.get(ProductsService);
    const product = await products.create({
      nameUz: 'Test mahsulot',
      nameRu: 'Тест товар',
      unit: 'DONA',
      costPrice: 6_000,
      retailPrice: 10_000,
    });

    const snapshot = await fetch(`${baseUrl}/sync/changes?since=0`, { headers: deviceHeaders() });
    const snapshotBody = (await snapshot.json()) as SyncChangesResponse;
    expect(snapshotBody.isSnapshot).toBe(true);
    expect(snapshotBody.changes.some((c) => c.entity === 'Product' && c.entityId === product.id)).toBe(
      true,
    );

    const cursor = snapshotBody.cursor;
    expect(cursor).toBeGreaterThan(0);

    await products.update(product.id, { retailPrice: 99_000 });

    const incremental = await fetch(`${baseUrl}/sync/changes?since=${cursor}`, {
      headers: deviceHeaders(),
    });
    const incrementalBody = (await incremental.json()) as SyncChangesResponse;
    expect(incrementalBody.isSnapshot).toBe(false);
    expect(incrementalBody.changes).toHaveLength(1);
    expect(incrementalBody.changes[0]?.entityId).toBe(product.id);
  });

  it('POST /sync/shifts/open — openedById faol bo‘lishi shart, aks holda 403', async () => {
    const res = await fetch(`${baseUrl}/sync/shifts/open`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify({
        id: crypto.randomUUID(),
        registerId,
        openingCash: 0,
        openedById: crypto.randomUUID(),
      }),
    });
    expect(res.status).toBe(403);
  });

  it('POST /sync/shifts/open va /sync/sales — to‘liq oflayn push oqimi (idempotent)', async () => {
    const cashier = await createUser(prisma);
    const product = await createProduct(prisma, { retailPrice: 10_000, costPrice: 6_000 });
    const shiftId = crypto.randomUUID();

    const openBody = {
      id: shiftId,
      registerId,
      openingCash: 0,
      openedById: cashier.id,
    };
    const open1 = await fetch(`${baseUrl}/sync/shifts/open`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify(openBody),
    });
    expect(open1.status).toBe(201);
    // Outbox qayta yuborsa ham xato bermasligi kerak.
    const open2 = await fetch(`${baseUrl}/sync/shifts/open`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify(openBody),
    });
    expect(open2.status).toBe(201);
    expect(await prisma.shift.count()).toBe(1);

    const saleBody = {
      id: crypto.randomUUID(),
      shiftId,
      number: 'T01-000001',
      cashierId: cashier.id,
      lines: [
        {
          id: crypto.randomUUID(),
          productId: product.id,
          name: product.nameUz,
          unit: 'DONA',
          qty: 1_000,
          unitPrice: 10_000,
          priceType: 'RETAIL',
          costPrice: 6_000,
        },
      ],
      payments: [{ method: 'CASH', amount: 10_000 }],
      occurredAt: new Date().toISOString(),
    };
    const sale1 = await fetch(`${baseUrl}/sync/sales`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify(saleBody),
    });
    expect(sale1.status).toBe(201);
    const sale2 = await fetch(`${baseUrl}/sync/sales`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify(saleBody),
    });
    expect(sale2.status).toBe(201);
    expect(await prisma.sale.count()).toBe(1);

    const close = await fetch(`${baseUrl}/sync/shifts/${shiftId}/close`, {
      method: 'POST',
      headers: deviceHeaders(),
      body: JSON.stringify({ closingCash: 10_000, closedById: cashier.id }),
    });
    expect(close.status).toBe(201);
    const closed = (await close.json()) as { status: string; variance: number };
    expect(closed.status).toBe('CLOSED');
    expect(closed.variance).toBe(0);
  });
});
