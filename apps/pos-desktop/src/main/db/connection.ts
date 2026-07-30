import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// `node:sqlite` hali eksperimental — Vite'ning bandle/SSR aniqlash
// mantig'i uni "brauzer uchun tashqi" deb noto'g'ri belgilab, statik
// `import` qilinsa build/test payti qulaydi. `process.getBuiltinModule`
// esa oddiy funksiya chaqiruvi — Vite uchun hech qanday modul
// spetsifikatori emas, shu bilan bu muammoni butunlay chetlab o'tadi.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as {
  DatabaseSync: typeof DatabaseSyncType;
};

/**
 * Lokal SQLite oynasi — server katalogi/foydalanuvchilari nusxasi
 * (spravochnik) + hali serverga yubormagan hujjatlar navbati (outbox).
 * `path` sifatida `:memory:` berilsa (testlarda) hech qanday faylga
 * tegilmaydi.
 */
export function openConnection(path: string): DatabaseSyncType {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  nameUz TEXT NOT NULL,
  nameRu TEXT NOT NULL,
  parentId TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  nameUz TEXT NOT NULL,
  nameRu TEXT NOT NULL,
  unit TEXT NOT NULL,
  categoryId TEXT,
  costPrice INTEGER NOT NULL,
  retailPrice INTEGER NOT NULL,
  wholesalePrice INTEGER NOT NULL,
  minStock INTEGER NOT NULL,
  isActive INTEGER NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (nameUz, nameRu);

CREATE TABLE IF NOT EXISTS barcodes (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  code TEXT NOT NULL,
  isPrimary INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_barcodes_code ON barcodes (code);
CREATE INDEX IF NOT EXISTS idx_barcodes_product ON barcodes (productId);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  role TEXT NOT NULL,
  pinHash TEXT NOT NULL,
  isActive INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS registers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  lastReceiptSeq INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  registerId TEXT NOT NULL,
  openedById TEXT NOT NULL,
  openedAt TEXT NOT NULL,
  openingCash INTEGER NOT NULL,
  closedById TEXT,
  closedAt TEXT,
  closingCash INTEGER,
  expectedCash INTEGER,
  variance INTEGER,
  status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shifts_register_status ON shifts (registerId, status);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  registerId TEXT NOT NULL,
  shiftId TEXT NOT NULL,
  cashierId TEXT NOT NULL,
  customerId TEXT,
  totalAmount INTEGER NOT NULL,
  occurredAt TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox (status, id);

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cursor INTEGER NOT NULL DEFAULT 0,
  lastSyncAt TEXT
);
`;
