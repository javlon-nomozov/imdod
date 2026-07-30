import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { createRegister, createUser } from '../test/fixtures';
import { resetDb } from '../test/reset-db';
import { ShiftsService } from './shifts.service';

const prisma = new PrismaService();
const shifts = new ShiftsService(prisma);

describe('ShiftsService', () => {
  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bitta registerda faqat bitta OPEN smenaga ruxsat beradi (parallel ochish)', async () => {
    const register = await createRegister(prisma);
    const user = await createUser(prisma);

    const results = await Promise.allSettled([
      shifts.openShift(crypto.randomUUID(), register.id, user.id, 100_000),
      shifts.openShift(crypto.randomUUID(), register.id, user.id, 100_000),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const openShifts = await prisma.shift.count({
      where: { registerId: register.id, status: 'OPEN' },
    });
    expect(openShifts).toBe(1);
  });

  it('bir xil id bilan qayta ochilsa mavjud smenani qaytaradi (idempotentlik)', async () => {
    const register = await createRegister(prisma);
    const user = await createUser(prisma);
    const id = crypto.randomUUID();

    const first = await shifts.openShift(id, register.id, user.id, 100_000);
    const second = await shifts.openShift(id, register.id, user.id, 100_000);

    expect(second.id).toBe(first.id);
    expect(await prisma.shift.count()).toBe(1);
  });

  it('yopilganda variance to‘g‘ri hisoblanadi (savdosiz smena)', async () => {
    const register = await createRegister(prisma);
    const user = await createUser(prisma);
    const shift = await shifts.openShift(crypto.randomUUID(), register.id, user.id, 100_000);

    const closed = await shifts.closeShift(shift.id, user.id, 100_000);
    expect(closed.expectedCash).toBe(100_000);
    expect(closed.variance).toBe(0);
  });

  it('allaqachon yopilgan smenani qayta yopish xato bermaydi (outbox qayta yuborishi uchun)', async () => {
    const register = await createRegister(prisma);
    const user = await createUser(prisma);
    const shift = await shifts.openShift(crypto.randomUUID(), register.id, user.id, 100_000);

    const first = await shifts.closeShift(shift.id, user.id, 100_000);
    const second = await shifts.closeShift(shift.id, user.id, 100_000);

    expect(second.status).toBe('CLOSED');
    expect(second.closedAt).toEqual(first.closedAt);
  });

  it('smena yopilgandan keyin yangi smena ochishga ruxsat beradi', async () => {
    const register = await createRegister(prisma);
    const user = await createUser(prisma);
    const first = await shifts.openShift(crypto.randomUUID(), register.id, user.id, 0);
    await shifts.closeShift(first.id, user.id, 0);

    const second = await shifts.openShift(crypto.randomUUID(), register.id, user.id, 50_000);
    expect(second.status).toBe('OPEN');
  });
});
