import type { ChangeEnvelope, SyncChangesResponse, SyncRegisterSnapshot, SyncUserSnapshot } from '@imdod/sync';
import type { ProductsRepo } from '../db/products.repo';
import type { RegistersRepo } from '../db/registers.repo';
import type { SyncStateRepo } from '../db/sync-state.repo';
import type { UsersRepo } from '../db/users.repo';
import { syncFetch, type SyncHttpConfig } from './http';

export interface PullRepos {
  products: ProductsRepo;
  users: UsersRepo;
  registers: RegistersRepo;
  syncState: SyncStateRepo;
}

const CHANGES_PAGE_LIMIT = 500;

interface CategoryPayload {
  id: string;
  nameUz: string;
  nameRu: string;
  parentId: string | null;
  sortOrder: number;
}

interface BarcodePayload {
  id: string;
  productId: string;
  code: string;
  isPrimary: boolean;
}

interface ProductPayload {
  id: string;
  nameUz: string;
  nameRu: string;
  unit: string;
  categoryId: string | null;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  isActive: boolean;
  updatedAt: string;
  barcodes: BarcodePayload[];
}

/**
 * `/sync/register`, `/sync/users`, `/sync/changes` — lokal ko'zguni
 * serverga moslashtiradi. Foydalanuvchilar ro'yxati har doim TO'LIQ
 * almashtiriladi (`replaceAll`) — server ham har safar to'liq faol
 * ro'yxatni qaytaradi (o'sish tarixi emas).
 */
export async function pull(config: SyncHttpConfig, repos: PullRepos): Promise<void> {
  const register = await syncFetch<SyncRegisterSnapshot>(config, '/sync/register');
  repos.registers.upsert(register);

  const users = await syncFetch<SyncUserSnapshot[]>(config, '/sync/users');
  repos.users.replaceAll(users);

  let cursor = repos.syncState.get().cursor;
  for (;;) {
    const page = await syncFetch<SyncChangesResponse>(config, '/sync/changes', {
      query: { since: cursor, limit: CHANGES_PAGE_LIMIT },
    });
    applyChanges(repos.products, page.changes);
    repos.syncState.setCursor(page.cursor);
    cursor = page.cursor;
    if (page.changes.length < CHANGES_PAGE_LIMIT) break;
  }
}

function applyChanges(products: ProductsRepo, changes: ChangeEnvelope[]): void {
  for (const change of changes) {
    if (change.entity === 'Category') {
      if (change.op === 'DELETE') {
        products.deleteCategory(change.entityId);
      } else {
        products.upsertCategory(change.payload as CategoryPayload);
      }
    } else if (change.entity === 'Product') {
      // Mahsulot serverda hech qachon qattiq o'chirilmaydi (yumshoq
      // o'chirish ham UPSERT, isActive:false bilan) — shuning uchun bu
      // yerda DELETE holati hech qachon kutilmaydi.
      products.upsertProduct(change.payload as ProductPayload);
    } else if (change.entity === 'Barcode') {
      if (change.op === 'DELETE') {
        products.deleteBarcode(change.entityId);
      } else {
        products.upsertBarcode(change.payload as BarcodePayload);
      }
    }
  }
}
