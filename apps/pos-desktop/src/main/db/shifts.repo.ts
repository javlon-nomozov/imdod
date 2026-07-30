import type { DatabaseSync } from 'node:sqlite';
import { computeExpectedCash, type PaymentMethod } from '@imdod/core';

export interface LocalShift {
  id: string;
  registerId: string;
  openedById: string;
  openedAt: string;
  openingCash: number;
  closedById: string | null;
  closedAt: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  status: 'OPEN' | 'CLOSED';
}

interface SalePayloadForCash {
  totalAmount: number;
  payments: { method: PaymentMethod; amount: number }[];
}

/**
 * Smenaning lokal nusxasi — oflaynda ochilib/yopilib, keyin outbox orqali
 * serverga push qilinadi. `expectedCash` yopishda SHU YERDA hisoblanadi
 * (`computeExpectedCash`, `@imdod/core`) — serverdagi bilan bir xil
 * formula, chunki tarmoqsiz smenani yopish kerak.
 */
export class ShiftsRepo {
  constructor(private readonly db: DatabaseSync) {}

  createLocal(shift: {
    id: string;
    registerId: string;
    openedById: string;
    openedAt: string;
    openingCash: number;
  }): LocalShift {
    const existing = this.get(shift.id);
    if (existing) return existing;

    this.db
      .prepare(
        `INSERT INTO shifts (id, registerId, openedById, openedAt, openingCash, status)
         VALUES (?, ?, ?, ?, ?, 'OPEN')`,
      )
      .run(shift.id, shift.registerId, shift.openedById, shift.openedAt, shift.openingCash);
    return this.get(shift.id)!;
  }

  closeLocal(shiftId: string, closedById: string, closingCash: number): LocalShift {
    const shift = this.get(shiftId);
    if (!shift) throw new Error('Smena topilmadi');
    if (shift.status === 'CLOSED') return shift;

    const rows = this.db
      .prepare('SELECT totalAmount, payload FROM sales WHERE shiftId = ?')
      .all(shiftId) as { totalAmount: number; payload: string }[];
    const sales: SalePayloadForCash[] = rows.map((r) => ({
      totalAmount: r.totalAmount,
      payments: (JSON.parse(r.payload) as { payments: SalePayloadForCash['payments'] }).payments,
    }));

    const expectedCash = computeExpectedCash(shift.openingCash, sales);
    const variance = closingCash - expectedCash;

    this.db
      .prepare(
        `UPDATE shifts SET closedById = ?, closedAt = ?, closingCash = ?, expectedCash = ?, variance = ?, status = 'CLOSED'
         WHERE id = ?`,
      )
      .run(closedById, new Date().toISOString(), closingCash, expectedCash, variance, shiftId);
    return this.get(shiftId)!;
  }

  getCurrentOpen(registerId: string): LocalShift | null {
    const row = this.db
      .prepare("SELECT * FROM shifts WHERE registerId = ? AND status = 'OPEN'")
      .get(registerId) as RawShiftRow | undefined;
    return row ? fromRow(row) : null;
  }

  get(id: string): LocalShift | null {
    const row = this.db.prepare('SELECT * FROM shifts WHERE id = ?').get(id) as
      | RawShiftRow
      | undefined;
    return row ? fromRow(row) : null;
  }
}

interface RawShiftRow {
  id: string;
  registerId: string;
  openedById: string;
  openedAt: string;
  openingCash: number;
  closedById: string | null;
  closedAt: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  status: string;
}

function fromRow(row: RawShiftRow): LocalShift {
  return { ...row, status: row.status as 'OPEN' | 'CLOSED' };
}
