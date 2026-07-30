import type { DatabaseSync } from 'node:sqlite';

export interface SyncState {
  cursor: number;
  lastSyncAt: string | null;
}

/** `ChangeLog` kursori — qurilma qayerdan qadar o'qib olganini eslab qoladi. */
export class SyncStateRepo {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec('INSERT OR IGNORE INTO sync_state (id, cursor, lastSyncAt) VALUES (1, 0, NULL)');
  }

  get(): SyncState {
    const row = this.db
      .prepare('SELECT cursor, lastSyncAt FROM sync_state WHERE id = 1')
      .get() as unknown as SyncState;
    return row;
  }

  setCursor(cursor: number): void {
    this.db
      .prepare('UPDATE sync_state SET cursor = ?, lastSyncAt = ? WHERE id = 1')
      .run(cursor, new Date().toISOString());
  }
}
