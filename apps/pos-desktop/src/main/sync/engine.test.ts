import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkOnline } from './connectivity';
import { SyncEngine } from './engine';
import { pull } from './pull';
import { push } from './push';

vi.mock('./connectivity', () => ({ checkOnline: vi.fn() }));
vi.mock('./pull', () => ({ pull: vi.fn() }));
vi.mock('./push', () => ({ push: vi.fn() }));

describe('SyncEngine', () => {
  const mockedCheckOnline = vi.mocked(checkOnline);
  const mockedPush = vi.mocked(push);
  const mockedPull = vi.mocked(pull);

  beforeEach(() => {
    vi.useFakeTimers();
    mockedCheckOnline.mockReset();
    mockedPush.mockReset().mockResolvedValue(undefined);
    mockedPull.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeDeps(config: { apiBaseUrl: string; deviceToken: string } | null) {
    const outbox = { countPending: vi.fn().mockReturnValue(0) };
    const onStatusChange = vi.fn();
    return {
      deps: {
        getConfig: () => config,
        repos: { products: {}, users: {}, registers: {}, syncState: {}, outbox } as never,
        onStatusChange,
      },
      onStatusChange,
      outbox,
    };
  }

  it('konfiguratsiya yo‘q bo‘lsa hech narsa qilmaydi', async () => {
    const { deps, onStatusChange } = makeDeps(null);
    const engine = new SyncEngine(deps);
    await engine.runNow();
    expect(mockedCheckOnline).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('oflaynda push/pull chaqirmaydi, holatni "offline" deb yangilaydi', async () => {
    mockedCheckOnline.mockResolvedValue(false);
    const { deps, onStatusChange } = makeDeps({ apiBaseUrl: 'http://x', deviceToken: 't' });
    const engine = new SyncEngine(deps);

    await engine.runNow();

    expect(mockedPush).not.toHaveBeenCalled();
    expect(mockedPull).not.toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ online: false }));
  });

  it('onlaynda AVVAL push, SO‘NG pull chaqiradi', async () => {
    mockedCheckOnline.mockResolvedValue(true);
    const order: string[] = [];
    mockedPush.mockImplementation(async () => {
      order.push('push');
    });
    mockedPull.mockImplementation(async () => {
      order.push('pull');
    });
    const { deps } = makeDeps({ apiBaseUrl: 'http://x', deviceToken: 't' });
    const engine = new SyncEngine(deps);

    await engine.runNow();

    expect(order).toEqual(['push', 'pull']);
    expect(engine.getStatus().lastSyncAt).not.toBeNull();
    expect(engine.getStatus().syncing).toBe(false);
  });

  it('push/pull xato tashlasa ilova qulamaydi, syncing false bo‘lib qoladi', async () => {
    mockedCheckOnline.mockResolvedValue(true);
    mockedPush.mockRejectedValue(new Error('boom'));
    const { deps } = makeDeps({ apiBaseUrl: 'http://x', deviceToken: 't' });
    const engine = new SyncEngine(deps);

    await expect(engine.runNow()).resolves.toBeUndefined();
    expect(engine.getStatus().syncing).toBe(false);
  });

  it('start — intervalda takror chaqiradi, stop — to‘xtatadi', async () => {
    mockedCheckOnline.mockResolvedValue(false);
    const { deps } = makeDeps({ apiBaseUrl: 'http://x', deviceToken: 't' });
    const engine = new SyncEngine(deps);

    engine.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockedCheckOnline).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(mockedCheckOnline).toHaveBeenCalledTimes(2);

    engine.stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockedCheckOnline).toHaveBeenCalledTimes(2);
  });
});
