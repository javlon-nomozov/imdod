import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openConnection } from '../db/connection';
import { OutboxRepo } from '../db/outbox.repo';
import { push } from './push';

function response(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('push', () => {
  let db: DatabaseSync;
  let outbox: OutboxRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    outbox = new OutboxRepo(db);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('FIFO tartibda yuboradi va hammasini "sent" deb belgilaydi', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        calls.push(new URL(url).pathname);
        return response(201);
      }),
    );

    outbox.enqueue('shift.open', { id: 'shift-1', registerId: 'r1', openingCash: 0, openedById: 'u1' });
    outbox.enqueue('sale.create', { id: 'sale-1' });

    await push({ apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' }, outbox);

    expect(calls).toEqual(['/sync/shifts/open', '/sync/sales']);
    expect(outbox.listPending()).toHaveLength(0);
  });

  it('4xx — shu yozuvni "failed" belgilab, navbatda DAVOM etadi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(response(403)).mockResolvedValueOnce(response(201)),
    );

    outbox.enqueue('shift.open', { id: 'shift-1' });
    outbox.enqueue('sale.create', { id: 'sale-1' });

    await push({ apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' }, outbox);

    expect(outbox.listPending()).toHaveLength(0);
    const failed = db.prepare("SELECT * FROM outbox WHERE status = 'failed'").all() as { kind: string }[];
    expect(failed).toHaveLength(1);
  });

  it('tarmoq/5xx xatosi — o‘sha yozuvda TO‘XTAYDI (FIFO buzilmasin)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    outbox.enqueue('shift.open', { id: 'shift-1' });
    outbox.enqueue('sale.create', { id: 'sale-1' });

    await push({ apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' }, outbox);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outbox.listPending()).toHaveLength(2);
    expect(outbox.listPending()[0]?.attempts).toBe(1);
  });

  it('shift.close — shiftId URLga chiqadi, qolgani bodyga', async () => {
    let capturedUrl = '';
    let capturedBody: unknown = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        capturedUrl = new URL(url).pathname;
        capturedBody = init?.body ? JSON.parse(init.body as string) : null;
        return response(201);
      }),
    );

    outbox.enqueue('shift.close', { shiftId: 'shift-1', closingCash: 5000, closedById: 'u1' });
    await push({ apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' }, outbox);

    expect(capturedUrl).toBe('/sync/shifts/shift-1/close');
    expect(capturedBody).toEqual({ closingCash: 5000, closedById: 'u1' });
  });
});
