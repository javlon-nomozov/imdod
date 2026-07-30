import type { OutboxRepo } from '../db/outbox.repo';
import { checkOnline } from './connectivity';
import type { SyncHttpConfig } from './http';
import { pull, type PullRepos } from './pull';
import { push } from './push';

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

export interface SyncEngineDeps {
  /** `null` — qurilma hali sozlanmagan (token yo'q), sinxronizatsiya kutiladi. */
  getConfig: () => SyncHttpConfig | null;
  repos: PullRepos & { outbox: OutboxRepo };
  onStatusChange?: (status: SyncStatus) => void;
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Davriy so'rov (polling) — real-vaqt WebSocket keyingi bosqichda.
 * Har tsiklda: ulanishni tekshiradi → onlayn bo'lsa AVVAL push (outbox),
 * SO'NG pull (spravochnik) — shu tartib muhim, chunki push paytida
 * yozilgan yangi ma'lumot bir zumda pull orqali qaytib kelmasligi kerak
 * emas, lekin push navbatning o'zi FIFO bo'lishi kerak edi (push.ts'da).
 */
export class SyncEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = {
    online: false,
    syncing: false,
    pendingCount: 0,
    lastSyncAt: null,
  };

  constructor(private readonly deps: SyncEngineDeps) {}

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.deps.intervalMs ?? DEFAULT_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  /** Foydalanuvchi harakatidan keyin (masalan savdo yaratildi) darhol urinish uchun. */
  async runNow(): Promise<void> {
    await this.tick();
  }

  private async tick(): Promise<void> {
    const config = this.deps.getConfig();
    if (!config) return;

    const online = await checkOnline(config.apiBaseUrl);
    this.updateStatus({ online, pendingCount: this.deps.repos.outbox.countPending() });
    if (!online) return;

    this.updateStatus({ syncing: true });
    try {
      await push(config, this.deps.repos.outbox);
      await pull(config, this.deps.repos);
      this.updateStatus({ lastSyncAt: new Date().toISOString() });
    } catch (err) {
      // push/pull ichki (outbox bilan bog'liq) xatolari odatda outbox
      // holatiga yoziladi va shu yerga yetib kelmaydi — bu yerga tushgan
      // xato (masalan `/sync/register`ning o'zi 401/500 qaytarishi)
      // konsolga chiqariladi, aks holda sababini aniqlash imkonsiz bo'lardi.
      console.error('[sync] tsikl muvaffaqiyatsiz tugadi:', err);
    } finally {
      this.updateStatus({ syncing: false, pendingCount: this.deps.repos.outbox.countPending() });
    }
  }

  private updateStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    this.deps.onStatusChange?.(this.status);
  }
}
