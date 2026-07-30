import type { DatabaseSync } from 'node:sqlite';

export type OutboxKind = 'shift.open' | 'shift.close' | 'sale.create';

export interface OutboxEntry {
  id: number;
  kind: OutboxKind;
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastError: string | null;
}

interface OutboxRow {
  id: number;
  kind: string;
  payload: string;
  createdAt: string;
  status: string;
  attempts: number;
  lastError: string | null;
}

function fromRow(row: OutboxRow): OutboxEntry {
  return {
    id: row.id,
    kind: row.kind as OutboxKind,
    payload: JSON.parse(row.payload) as unknown,
    createdAt: row.createdAt,
    status: row.status as OutboxEntry['status'],
    attempts: row.attempts,
    lastError: row.lastError,
  };
}

/**
 * Serverga hali yuborilmagan hujjatlar navbati. `listPending` FIFO
 * tartibda qaytaradi — smena ochilishi o'zining savdolaridan OLDIN
 * push bo'lishi shart, aks holda server "ochiq smena topilmadi" deb rad
 * etadi.
 */
export class OutboxRepo {
  constructor(private readonly db: DatabaseSync) {}

  enqueue(kind: OutboxKind, payload: unknown): OutboxEntry {
    const createdAt = new Date().toISOString();
    const result = this.db
      .prepare('INSERT INTO outbox (kind, payload, createdAt) VALUES (?, ?, ?)')
      .run(kind, JSON.stringify(payload), createdAt);
    return {
      id: Number(result.lastInsertRowid),
      kind,
      payload,
      createdAt,
      status: 'pending',
      attempts: 0,
      lastError: null,
    };
  }

  listPending(): OutboxEntry[] {
    const rows = this.db
      .prepare("SELECT * FROM outbox WHERE status = 'pending' ORDER BY id ASC")
      .all() as unknown as OutboxRow[];
    return rows.map(fromRow);
  }

  markSent(id: number): void {
    this.db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?").run(id);
  }

  markFailed(id: number, error: string): void {
    this.db
      .prepare(
        "UPDATE outbox SET status = 'failed', attempts = attempts + 1, lastError = ? WHERE id = ?",
      )
      .run(error, id);
  }

  /** Keyingi push'da qayta urinish uchun — masalan vaqtinchalik tarmoq xatosi (5xx). */
  markRetryable(id: number, error: string): void {
    this.db.prepare('UPDATE outbox SET attempts = attempts + 1, lastError = ? WHERE id = ?').run(
      error,
      id,
    );
  }

  countPending(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'")
      .get() as { count: number };
    return row.count;
  }
}
