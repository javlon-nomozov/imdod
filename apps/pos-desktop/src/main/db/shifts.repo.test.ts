import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { SalesRepo } from './sales.repo';
import { ShiftsRepo } from './shifts.repo';

describe('ShiftsRepo', () => {
  let db: DatabaseSync;
  let shifts: ShiftsRepo;
  let sales: SalesRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    shifts = new ShiftsRepo(db);
    sales = new SalesRepo(db);
  });

  it('bir xil id bilan qayta ochilsa mavjud smenani qaytaradi (idempotentlik)', () => {
    const input = {
      id: 'shift-1',
      registerId: 'r1',
      openedById: 'u1',
      openedAt: new Date().toISOString(),
      openingCash: 0,
    };
    const first = shifts.createLocal(input);
    const second = shifts.createLocal(input);
    expect(second).toEqual(first);
  });

  it('yopishda expectedCash savdolar asosida to‘g‘ri hisoblanadi', () => {
    shifts.createLocal({
      id: 'shift-1',
      registerId: 'r1',
      openedById: 'u1',
      openedAt: new Date().toISOString(),
      openingCash: 10_000,
    });
    sales.createLocal({
      id: 'sale-1',
      number: 'K01-000001',
      registerId: 'r1',
      shiftId: 'shift-1',
      cashierId: 'u1',
      totalAmount: 20_000,
      occurredAt: new Date().toISOString(),
      payload: { lines: [], payments: [{ method: 'CASH', amount: 20_000 }] },
    });

    const closed = shifts.closeLocal('shift-1', 'u1', 30_000);
    expect(closed.expectedCash).toBe(30_000);
    expect(closed.variance).toBe(0);
    expect(closed.status).toBe('CLOSED');
  });

  it('allaqachon yopilgan smenani qayta yopish xato bermaydi (outbox qayta yuborishi uchun)', () => {
    shifts.createLocal({
      id: 'shift-1',
      registerId: 'r1',
      openedById: 'u1',
      openedAt: new Date().toISOString(),
      openingCash: 0,
    });
    const first = shifts.closeLocal('shift-1', 'u1', 5_000);
    const second = shifts.closeLocal('shift-1', 'u1', 999_999);
    expect(second).toEqual(first);
  });

  it('getCurrentOpen — faqat OPEN holatdagi smenani topadi', () => {
    shifts.createLocal({
      id: 'shift-1',
      registerId: 'r1',
      openedById: 'u1',
      openedAt: new Date().toISOString(),
      openingCash: 0,
    });
    expect(shifts.getCurrentOpen('r1')?.id).toBe('shift-1');

    shifts.closeLocal('shift-1', 'u1', 0);
    expect(shifts.getCurrentOpen('r1')).toBeNull();
  });
});
