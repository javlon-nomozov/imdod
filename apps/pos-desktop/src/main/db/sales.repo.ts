import type { DatabaseSync } from 'node:sqlite';

/** `lines`/`payments`/`cartDiscount` — chek va outbox push uchun to'liq nusxa. */
export interface LocalSalePayload {
  lines: unknown[];
  payments: { method: string; amount: number }[];
  cartDiscount?: unknown;
}

export interface LocalSaleInput {
  id: string;
  number: string;
  registerId: string;
  shiftId: string;
  cashierId: string;
  customerId?: string | null;
  totalAmount: number;
  occurredAt: string;
  payload: LocalSalePayload;
}

export interface LocalSale extends LocalSaleInput {
  customerId: string | null;
}

interface SaleRow {
  id: string;
  number: string;
  registerId: string;
  shiftId: string;
  cashierId: string;
  customerId: string | null;
  totalAmount: number;
  occurredAt: string;
  payload: string;
}

function fromRow(row: SaleRow): LocalSale {
  return {
    id: row.id,
    number: row.number,
    registerId: row.registerId,
    shiftId: row.shiftId,
    cashierId: row.cashierId,
    customerId: row.customerId,
    totalAmount: row.totalAmount,
    occurredAt: row.occurredAt,
    payload: JSON.parse(row.payload) as LocalSalePayload,
  };
}

/**
 * Savdoning lokal nusxasi — chek raqami MANA SHU YERDA (qurilmada)
 * generatsiya qilinadi (`registers.repo.ts`ning ketma-ketligidan),
 * chunki oflaynda serverdan navbat so'rab bo'lmaydi.
 */
export class SalesRepo {
  constructor(private readonly db: DatabaseSync) {}

  createLocal(input: LocalSaleInput): LocalSale {
    const existing = this.get(input.id);
    if (existing) return existing;

    this.db
      .prepare(
        `INSERT INTO sales (id, number, registerId, shiftId, cashierId, customerId, totalAmount, occurredAt, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.number,
        input.registerId,
        input.shiftId,
        input.cashierId,
        input.customerId ?? null,
        input.totalAmount,
        input.occurredAt,
        JSON.stringify(input.payload),
      );
    return this.get(input.id)!;
  }

  get(id: string): LocalSale | null {
    const row = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as unknown as
      | SaleRow
      | undefined;
    return row ? fromRow(row) : null;
  }

  listByShift(shiftId: string): LocalSale[] {
    const rows = this.db.prepare('SELECT * FROM sales WHERE shiftId = ?').all(shiftId) as unknown as SaleRow[];
    return rows.map(fromRow);
  }
}
