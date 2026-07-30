import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { SalesRepo } from './sales.repo';

describe('SalesRepo', () => {
  let db: DatabaseSync;
  let repo: SalesRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new SalesRepo(db);
  });

  it('savdoni saqlaydi va payloadni to‘liq qayta tiklaydi', () => {
    const input = {
      id: 'sale-1',
      number: 'K01-000001',
      registerId: 'r1',
      shiftId: 'shift-1',
      cashierId: 'u1',
      totalAmount: 20_000,
      occurredAt: new Date().toISOString(),
      payload: {
        lines: [{ id: 'l1', productId: 'p1', qty: 1000 }],
        payments: [{ method: 'CASH', amount: 20_000 }],
      },
    };
    const created = repo.createLocal(input);
    expect(created.number).toBe('K01-000001');
    expect(created.payload.lines).toHaveLength(1);

    const reloaded = repo.get('sale-1');
    expect(reloaded).toEqual(created);
  });

  it('bir xil id bilan qayta yuborilsa dublikat yaratmaydi', () => {
    const input = {
      id: 'sale-1',
      number: 'K01-000001',
      registerId: 'r1',
      shiftId: 'shift-1',
      cashierId: 'u1',
      totalAmount: 20_000,
      occurredAt: new Date().toISOString(),
      payload: { lines: [], payments: [] },
    };
    repo.createLocal(input);
    repo.createLocal(input);
    expect(repo.listByShift('shift-1')).toHaveLength(1);
  });
});
