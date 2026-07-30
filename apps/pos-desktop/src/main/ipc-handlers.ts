import { writeFile } from 'node:fs/promises';
import { app, dialog, ipcMain } from 'electron';
import {
  clearDeviceToken,
  getApiBaseUrl,
  getDeviceToken,
  hasDeviceToken,
  setApiBaseUrl,
  setDeviceToken,
} from './config-store';
import { openPrintPreview } from './print-window';

interface SaveFilePayload {
  bytes: number[];
  suggestedName: string;
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => ({
    apiBaseUrl: getApiBaseUrl(),
    hasDeviceToken: hasDeviceToken(),
    // Faqat shu yerda — renderer o'zining fetch so'rovlariga
    // `x-device-token` sarlavhasini qo'shishi uchun.
    deviceToken: getDeviceToken(),
  }));

  ipcMain.handle('config:set-api-base-url', (_event, url: string) => {
    setApiBaseUrl(url);
  });

  ipcMain.handle('config:set-device-token', (_event, token: string) => {
    setDeviceToken(token);
  });

  ipcMain.handle('config:clear-device-token', () => {
    clearDeviceToken();
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
}
