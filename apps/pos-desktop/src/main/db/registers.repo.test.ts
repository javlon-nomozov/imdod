import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { openConnection } from './connection';
import { RegistersRepo } from './registers.repo';

describe('RegistersRepo', () => {
  let db: DatabaseSync;
  let repo: RegistersRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    repo = new RegistersRepo(db);
  });

  it('upsert qilib, so‘ng ketma-ketlikni mahalliy oshiradi', () => {
    repo.upsert({ id: 'r1', code: 'K01', lastReceiptSeq: 5 });
    expect(repo.nextReceiptSeq('r1')).toBe(6);
    expect(repo.nextReceiptSeq('r1')).toBe(7);
    expect(repo.get('r1')?.lastReceiptSeq).toBe(7);
  });

  it('upsert serverdan PASTROQ qiymat bilan kelsa, mahalliy (kattaroq) seq saqlanadi', () => {
    repo.upsert({ id: 'r1', code: 'K01', lastReceiptSeq: 0 });
    repo.nextReceiptSeq('r1');
    repo.nextReceiptSeq('r1');
    expect(repo.get('r1')?.lastReceiptSeq).toBe(2);

    // Server hali 0'da qolgan bo'lsa ham mahalliy 2 pasaymasligi kerak.
    repo.upsert({ id: 'r1', code: 'K01', lastReceiptSeq: 0 });
    expect(repo.get('r1')?.lastReceiptSeq).toBe(2);
  });
});
