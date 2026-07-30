import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openConnection } from '../db/connection';
import { ProductsRepo } from '../db/products.repo';
import { RegistersRepo } from '../db/registers.repo';
import { SyncStateRepo } from '../db/sync-state.repo';
import { UsersRepo } from '../db/users.repo';
import { pull } from './pull';

function jsonResponse(body: unknown): Response {
  return { ok: true, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe('pull', () => {
  let db: DatabaseSync;
  let products: ProductsRepo;
  let users: UsersRepo;
  let registers: RegistersRepo;
  let syncState: SyncStateRepo;

  beforeEach(() => {
    db = openConnection(':memory:');
    products = new ProductsRepo(db);
    users = new UsersRepo(db);
    registers = new RegistersRepo(db);
    syncState = new SyncStateRepo(db);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('register/users/changes — hammasini lokal ko‘zguga yozadi', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const path = new URL(url).pathname;
      if (path === '/sync/register') {
        return jsonResponse({ id: 'r1', code: 'K01', lastReceiptSeq: 5 });
      }
      if (path === '/sync/users') {
        return jsonResponse([
          { id: 'u1', fullName: 'Kassir', role: 'CASHIER', pinHash: 'hash1', isActive: true },
        ]);
      }
      if (path === '/sync/changes') {
        return jsonResponse({
          isSnapshot: true,
          cursor: 3,
          changes: [
            {
              seq: 0,
              entity: 'Category',
              entityId: 'c1',
              op: 'UPSERT',
              payload: { id: 'c1', nameUz: 'Kanstovar', nameRu: 'Канцтовары', parentId: null, sortOrder: 0 },
              createdAt: new Date().toISOString(),
            },
            {
              seq: 0,
              entity: 'Product',
              entityId: 'p1',
              op: 'UPSERT',
              payload: {
                id: 'p1',
                nameUz: 'Daftar',
                nameRu: 'Тетрадь',
                unit: 'DONA',
                categoryId: 'c1',
                costPrice: 1000,
                retailPrice: 2000,
                wholesalePrice: 0,
                minStock: 0,
                isActive: true,
                updatedAt: new Date().toISOString(),
                barcodes: [{ id: 'b1', productId: 'p1', code: '111', isPrimary: true }],
              },
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }
      throw new Error(`unexpected path ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await pull(
      { apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' },
      { products, users, registers, syncState },
    );

    expect(registers.get('r1')?.lastReceiptSeq).toBe(5);
    expect(users.list()).toHaveLength(1);
    expect(products.findByCode('111').kind).toBe('single');
    expect(syncState.get().cursor).toBe(3);
  });

  it('sahifalash — limitga teng natija kelsa keyingi sahifani ham so‘raydi', async () => {
    let call = 0;
    const fetchMock = vi.fn(async (url: string | URL) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/sync/register') return jsonResponse({ id: 'r1', code: 'K01', lastReceiptSeq: 0 });
      if (parsed.pathname === '/sync/users') return jsonResponse([]);
      if (parsed.pathname === '/sync/changes') {
        call += 1;
        const since = Number(parsed.searchParams.get('since'));
        if (call === 1) {
          return jsonResponse({
            isSnapshot: since === 0,
            cursor: 500,
            changes: Array.from({ length: 500 }, (_, i) => ({
              seq: i + 1,
              entity: 'Category',
              entityId: `c${i}`,
              op: 'UPSERT',
              payload: { id: `c${i}`, nameUz: `C${i}`, nameRu: `C${i}`, parentId: null, sortOrder: 0 },
              createdAt: new Date().toISOString(),
            })),
          });
        }
        return jsonResponse({ isSnapshot: false, cursor: 500, changes: [] });
      }
      throw new Error('unexpected');
    });
    vi.stubGlobal('fetch', fetchMock);

    await pull(
      { apiBaseUrl: 'http://localhost:3000', deviceToken: 'tok' },
      { products, users, registers, syncState },
    );

    expect(call).toBe(2);
    expect(syncState.get().cursor).toBe(500);
  });
});
