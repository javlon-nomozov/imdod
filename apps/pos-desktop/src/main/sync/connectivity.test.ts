import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkOnline } from './connectivity';

describe('checkOnline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('server 200 qaytarsa true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );
    expect(await checkOnline('http://localhost:3000')).toBe(true);
  });

  it('server xato status qaytarsa false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
    expect(await checkOnline('http://localhost:3000')).toBe(false);
  });

  it('tarmoq xatosi (fetch throw) — false, ilova qulamaydi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    expect(await checkOnline('http://localhost:3000')).toBe(false);
  });
});
