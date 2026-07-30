import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { computeCart, formatReceiptNumber, type CartLineInput } from '@imdod/core';
import type { ScanOutcome } from '@imdod/core';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import {
  clearDeviceToken,
  getApiBaseUrl,
  hasDeviceToken,
  setApiBaseUrl,
  setDeviceToken,
} from './config-store';
import type { LocalProduct } from './db/products.repo';
import type { ProductsRepo } from './db/products.repo';
import type { RegistersRepo } from './db/registers.repo';
import type { OutboxRepo } from './db/outbox.repo';
import type { SalesRepo } from './db/sales.repo';
import type { ShiftsRepo } from './db/shifts.repo';
import type { UsersRepo } from './db/users.repo';
import { openPrintPreview } from './print-window';
import { getSession, setSession } from './session-state';
import type { SyncEngine, SyncStatus } from './sync/engine';

export interface IpcContext {
  products: ProductsRepo;
  users: UsersRepo;
  registers: RegistersRepo;
  shifts: ShiftsRepo;
  sales: SalesRepo;
  outbox: OutboxRepo;
  syncEngine: SyncEngine;
}

interface SaveFilePayload {
  bytes: number[];
  suggestedName: string;
}

interface CreateSaleLineInput {
  id: string;
  productId: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  priceType: string;
  costPrice: number;
  discountPercent?: number;
}

interface CreateSalePayload {
  shiftId: string;
  customerId?: string;
  cartDiscount?: { percent?: number; amount?: number };
  lines: CreateSaleLineInput[];
  payments: { method: string; amount: number }[];
  occurredAt: string;
}

function requireSession(): NonNullable<ReturnType<typeof getSession>> {
  const session = getSession();
  if (!session) throw new Error('Kassir tizimga kirmagan');
  return session;
}

export function registerIpcHandlers(ctx: IpcContext): void {
  ipcMain.handle('config:get', () => ({
    apiBaseUrl: getApiBaseUrl(),
    hasDeviceToken: hasDeviceToken(),
  }));

  ipcMain.handle('config:set-api-base-url', (_event, url: string) => {
    setApiBaseUrl(url);
  });

  ipcMain.handle('config:set-device-token', (_event, token: string) => {
    setDeviceToken(token);
  });

  ipcMain.handle('config:clear-device-token', () => {
    clearDeviceToken();
    setSession(null);
  });

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('print:preview', async (_event, html: string) => {
    await openPrintPreview(html);
  });

  ipcMain.handle('file:save', async (_event, payload: SaveFilePayload) => {
    const result = await dialog.showSaveDialog({ defaultPath: payload.suggestedName });
    if (result.canceled || !result.filePath) return { saved: false };
    await writeFile(result.filePath, Buffer.from(payload.bytes));
    return { saved: true, path: result.filePath };
  });

  // --- Katalog: qidiruv/skanerlash — HAR DOIM lokal ko'zgudan (oflaynda ham ishlaydi) ---

  ipcMain.handle('catalog:search', (_event, query: string): LocalProduct[] => {
    return ctx.products.search(query);
  });

  ipcMain.handle('catalog:scan', (_event, code: string): ScanOutcome<LocalProduct> => {
    return ctx.products.findByCode(code);
  });

  // --- Auth: PIN har doim lokal tekshiriladi ---

  // Renderer ishga tushganda: hali bir marta ham sinxronlanmagan bo'lsa
  // (yangi/tozalangan lokal baza) majburiy onlayn sinxronlash kerakligini
  // aniqlash uchun.
  ipcMain.handle('sync:has-local-data', () => ctx.registers.getMine() !== null);

  ipcMain.handle('auth:pin-login', async (_event, pin: string) => {
    const register = ctx.registers.getMine();
    if (!register) {
      throw new Error(
        'Qurilma hali serverdan bir marta ham sinxronlanmagan. Internetga ulanib qayta urining.',
      );
    }
    const user = await ctx.users.verifyPin(pin);
    if (!user) return null;

    setSession({ userId: user.id, fullName: user.fullName, role: user.role, registerId: register.id });
    return { userId: user.id, fullName: user.fullName, role: user.role, registerId: register.id };
  });

  ipcMain.handle('auth:logout', () => {
    setSession(null);
  });

  // --- Smena ---

  ipcMain.handle('shift:get-current', () => {
    const session = requireSession();
    return ctx.shifts.getCurrentOpen(session.registerId);
  });

  ipcMain.handle('shift:open', (_event, openingCash: number) => {
    const session = requireSession();
    const id = randomUUID();
    const openedAt = new Date().toISOString();
    const shift = ctx.shifts.createLocal({
      id,
      registerId: session.registerId,
      openedById: session.userId,
      openedAt,
      openingCash,
    });
    ctx.outbox.enqueue('shift.open', {
      id: shift.id,
      registerId: shift.registerId,
      openingCash: shift.openingCash,
      openedById: shift.openedById,
    });
    void ctx.syncEngine.runNow();
    return shift;
  });

  ipcMain.handle('shift:close', (_event, closingCash: number) => {
    const session = requireSession();
    const current = ctx.shifts.getCurrentOpen(session.registerId);
    if (!current) throw new Error('Ochiq smena topilmadi');
    const closed = ctx.shifts.closeLocal(current.id, session.userId, closingCash);
    ctx.outbox.enqueue('shift.close', {
      shiftId: closed.id,
      closingCash,
      closedById: session.userId,
    });
    void ctx.syncEngine.runNow();
    return closed;
  });

  // --- Savdo ---

  ipcMain.handle('sale:create', (_event, payload: CreateSalePayload) => {
    const session = requireSession();
    const register = ctx.registers.getMine();
    if (!register) throw new Error('Kassa maʼlumoti topilmadi');

    const cartLines: CartLineInput[] = payload.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      name: line.name,
      unit: line.unit,
      qty: line.qty,
      unitPrice: line.unitPrice,
      priceType: line.priceType,
      costPrice: line.costPrice,
      discountPercent: line.discountPercent,
    })) as CartLineInput[];
    const cart = computeCart(cartLines, payload.cartDiscount);

    const id = randomUUID();
    const seq = ctx.registers.nextReceiptSeq(register.id);
    const number = formatReceiptNumber(register.code, seq);

    const sale = ctx.sales.createLocal({
      id,
      number,
      registerId: register.id,
      shiftId: payload.shiftId,
      cashierId: session.userId,
      customerId: payload.customerId ?? null,
      totalAmount: cart.totals.total,
      occurredAt: payload.occurredAt,
      payload: { lines: cart.lines, payments: payload.payments, cartDiscount: payload.cartDiscount },
    });

    ctx.outbox.enqueue('sale.create', {
      id: sale.id,
      shiftId: sale.shiftId,
      number: sale.number,
      customerId: payload.customerId,
      cartDiscount: payload.cartDiscount,
      lines: payload.lines,
      payments: payload.payments,
      occurredAt: payload.occurredAt,
      cashierId: session.userId,
    });
    void ctx.syncEngine.runNow();

    const receivedAt = new Date().toISOString();
    return {
      id: sale.id,
      number: sale.number,
      registerId: sale.registerId,
      shiftId: sale.shiftId,
      cashierId: sale.cashierId,
      customerId: sale.customerId,
      grossAmount: cart.totals.gross,
      lineDiscount: cart.totals.lineDiscount,
      cartDiscount: cart.totals.cartDiscount,
      totalAmount: cart.totals.total,
      cashRounding: 0,
      profit: cart.totals.profit,
      occurredAt: sale.occurredAt,
      receivedAt,
      lines: cart.lines.map((line) => ({
        id: line.id,
        saleId: sale.id,
        productId: line.productId,
        nameSnapshot: line.name,
        unit: line.unit,
        qty: line.qty,
        unitPrice: line.unitPrice,
        priceType: line.priceType,
        discountPercent: line.discountPercent ?? 0,
        lineDiscount: line.lineDiscount,
        totalAmount: line.total,
        costPrice: line.costPrice,
        profit: line.profit,
      })),
      payments: payload.payments.map((p) => ({ id: randomUUID(), saleId: sale.id, ...p })),
    };
  });

  // --- Sinxronizatsiya holati ---

  ipcMain.handle('sync:get-status', () => ctx.syncEngine.getStatus());

  ipcMain.handle('sync:run-now', async () => {
    await ctx.syncEngine.runNow();
    return ctx.syncEngine.getStatus();
  });
}

export function broadcastSyncStatus(status: SyncStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('sync:status-changed', status);
  }
}
