import { join } from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import { getApiBaseUrl, getDeviceToken } from './config-store';
import { openConnection } from './db/connection';
import { OutboxRepo } from './db/outbox.repo';
import { ProductsRepo } from './db/products.repo';
import { RegistersRepo } from './db/registers.repo';
import { SalesRepo } from './db/sales.repo';
import { ShiftsRepo } from './db/shifts.repo';
import { SyncStateRepo } from './db/sync-state.repo';
import { UsersRepo } from './db/users.repo';
import { broadcastSyncStatus, registerIpcHandlers } from './ipc-handlers';
import { SyncEngine } from './sync/engine';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Ilova ichidan tashqi havolalar tizim brauzerida ochilsin — Electron
  // oynasi ichida notanish saytga o'tib qolmasin.
  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

void app.whenReady().then(() => {
  // Lokal spravochnik ko'zgusi + outbox — `--user-data-dir=<nom>` orqali
  // (Electron/Chromium'ning o'zi tan oladigan standart parametr) ikki
  // mustaqil nusxani parallel ishga tushirib, ikki-qurilma sinovi
  // o'tkazish mumkin (har biri o'z papkasi, demak o'z bazasi).
  const db = openConnection(join(app.getPath('userData'), 'local.db'));
  const repos = {
    products: new ProductsRepo(db),
    users: new UsersRepo(db),
    registers: new RegistersRepo(db),
    shifts: new ShiftsRepo(db),
    sales: new SalesRepo(db),
    outbox: new OutboxRepo(db),
    syncState: new SyncStateRepo(db),
  };

  const syncEngine = new SyncEngine({
    getConfig: () => {
      const deviceToken = getDeviceToken();
      if (!deviceToken) return null;
      return { apiBaseUrl: getApiBaseUrl(), deviceToken };
    },
    repos,
    onStatusChange: broadcastSyncStatus,
  });

  registerIpcHandlers({ ...repos, syncEngine });
  syncEngine.start();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
