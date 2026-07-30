import type { DatabaseSync } from 'node:sqlite';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { UsersRepo } from './users.repo';

describe('UsersRepo', () => {
  let db: DatabaseSync;
  let repo: UsersRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new UsersRepo(db);
  });

  it('to‘g‘ri PIN uchun foydalanuvchini qaytaradi, noto‘g‘ri uchun null', async () => {
    repo.upsert({
      id: 'u1',
      fullName: 'Kassir',
      role: 'CASHIER',
      pinHash: await argon2.hash('1234'),
      isActive: true,
    });

    const ok = await repo.verifyPin('1234');
    expect(ok?.id).toBe('u1');

    const bad = await repo.verifyPin('0000');
    expect(bad).toBeNull();
  });

  it('nofaol foydalanuvchi PIN bilan kira olmaydi', async () => {
    repo.upsert({
      id: 'u1',
      fullName: 'Bo‘shatilgan',
      role: 'CASHIER',
      pinHash: await argon2.hash('1234'),
      isActive: false,
    });

    expect(await repo.verifyPin('1234')).toBeNull();
  });

  it('replaceAll — eski ro‘yxatni to‘liq almashtiradi', async () => {
    repo.upsert({ id: 'u1', fullName: 'A', role: 'CASHIER', pinHash: await argon2.hash('1111'), isActive: true });
    repo.replaceAll([
      { id: 'u2', fullName: 'B', role: 'CASHIER', pinHash: await argon2.hash('2222'), isActive: true },
    ]);

    expect(repo.list()).toHaveLength(1);
    expect(await repo.verifyPin('1111')).toBeNull();
    expect((await repo.verifyPin('2222'))?.id).toBe('u2');
  });
});
