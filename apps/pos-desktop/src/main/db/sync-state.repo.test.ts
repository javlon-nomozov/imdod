import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { SyncStateRepo } from './sync-state.repo';

describe('SyncStateRepo', () => {
  let db: DatabaseSync;
  let repo: SyncStateRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new SyncStateRepo(db);
  });

  it('boshlang‘ich holat — cursor 0, lastSyncAt null', () => {
    expect(repo.get()).toEqual({ cursor: 0, lastSyncAt: null });
  });

  it('setCursor — cursor va lastSyncAt yangilanadi', () => {
    repo.setCursor(42);
    const state = repo.get();
    expect(state.cursor).toBe(42);
    expect(state.lastSyncAt).not.toBeNull();
  });
});
