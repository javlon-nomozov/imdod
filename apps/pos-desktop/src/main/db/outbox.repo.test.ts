import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { OutboxRepo } from './outbox.repo';

describe('OutboxRepo', () => {
  let db: DatabaseSync;
  let repo: OutboxRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new OutboxRepo(db);
  });

  it('FIFO tartibda navbatga qo‘yadi va qaytaradi', () => {
    repo.enqueue('shift.open', { id: 'shift-1' });
    repo.enqueue('sale.create', { id: 'sale-1' });
    repo.enqueue('sale.create', { id: 'sale-2' });

    const pending = repo.listPending();
    expect(pending.map((e) => e.kind)).toEqual(['shift.open', 'sale.create', 'sale.create']);
    expect(pending[1]?.payload).toEqual({ id: 'sale-1' });
  });

  it('markSent — pending ro‘yxatidan chiqaradi', () => {
    const entry = repo.enqueue('shift.open', { id: 'shift-1' });
    repo.markSent(entry.id);
    expect(repo.listPending()).toHaveLength(0);
  });

  it('markFailed — status "failed"ga o‘tadi, urinishlar soni oshadi, pendingdan chiqadi', () => {
    const entry = repo.enqueue('sale.create', { id: 'sale-1' });
    repo.markFailed(entry.id, '403 Forbidden');
    expect(repo.listPending()).toHaveLength(0);
  });

  it('markRetryable — pendingda qoladi, urinishlar soni oshadi (vaqtinchalik tarmoq xatosi uchun)', () => {
    const entry = repo.enqueue('sale.create', { id: 'sale-1' });
    repo.markRetryable(entry.id, 'network error');
    const pending = repo.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.attempts).toBe(1);
  });

  it('countPending — faqat kutilayotganlarni sanaydi', () => {
    const a = repo.enqueue('sale.create', {});
    repo.enqueue('sale.create', {});
    repo.markSent(a.id);
    expect(repo.countPending()).toBe(1);
  });
});
