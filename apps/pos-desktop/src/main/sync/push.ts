import type { OutboxEntry, OutboxRepo } from '../db/outbox.repo';
import { SyncApiError, syncFetch, type SyncHttpConfig } from './http';

interface ShiftClosePayload {
  shiftId: string;
  closingCash: number;
  closedById: string;
}

/**
 * Navbatni FIFO tartibda push qiladi — `shift.open` o'zining
 * savdolaridan OLDIN yozilgan bo'lishi kafolatlanadi (`outbox.repo.ts`
 * `id ASC` bilan qaytaradi, yozuvlar yaralish tartibida qo'shiladi).
 *
 * Tarmoq/5xx xatosida FIFO buzilmasligi uchun DARHOL to'xtaydi — keyingi
 * push urinishida xuddi shu yozuvdan qayta boshlanadi. 4xx (masalan
 * foydalanuvchi endi faol emas) — bu yozuv uchun qayta urinish ma'nosiz,
 * "failed" deb belgilanib navbat davom etadi.
 */
export async function push(config: SyncHttpConfig, outbox: OutboxRepo): Promise<void> {
  for (const entry of outbox.listPending()) {
    try {
      await sendOne(config, entry);
      outbox.markSent(entry.id);
    } catch (err) {
      if (err instanceof SyncApiError && err.status >= 400 && err.status < 500) {
        outbox.markFailed(entry.id, err.message);
        continue;
      }
      outbox.markRetryable(entry.id, err instanceof Error ? err.message : String(err));
      return;
    }
  }
}

async function sendOne(config: SyncHttpConfig, entry: OutboxEntry): Promise<void> {
  switch (entry.kind) {
    case 'shift.open':
      await syncFetch(config, '/sync/shifts/open', { method: 'POST', body: entry.payload });
      return;
    case 'shift.close': {
      const { shiftId, ...body } = entry.payload as ShiftClosePayload;
      await syncFetch(config, `/sync/shifts/${shiftId}/close`, { method: 'POST', body });
      return;
    }
    case 'sale.create':
      await syncFetch(config, '/sync/sales', { method: 'POST', body: entry.payload });
      return;
  }
}
