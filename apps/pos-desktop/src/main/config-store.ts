import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';

interface DeviceConfig {
  apiBaseUrl: string;
  deviceTokenEncrypted: string | null;
}

// Do'kon haqiqiy Railway'ga deploy qilingan serverni ishlatadi — birinchi
// sozlashda kassir/admin lokal manzil kiritishga majbur bo'lmasin.
// Lokal test uchun kerak bo'lsa, sozlash ekranida qo'lda o'zgartiriladi.
const DEFAULT_CONFIG: DeviceConfig = {
  apiBaseUrl: 'https://api-production-7438d.up.railway.app',
  deviceTokenEncrypted: null,
};

function configPath(): string {
  return join(app.getPath('userData'), 'device-config.json');
}

function readConfig(): DeviceConfig {
  const path = configPath();
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<DeviceConfig>;
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config: DeviceConfig): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
}

export function getApiBaseUrl(): string {
  return readConfig().apiBaseUrl;
}

export function setApiBaseUrl(url: string): void {
  const config = readConfig();
  config.apiBaseUrl = url;
  writeConfig(config);
}

/** Xom tokenni parolini ochib qaytaradi — renderer fetch sarlavhalari uchun ishlatadi. */
export function getDeviceToken(): string | null {
  const config = readConfig();
  if (!config.deviceTokenEncrypted) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(config.deviceTokenEncrypted, 'base64'));
  } catch {
    return null;
  }
}

export function setDeviceToken(rawToken: string): void {
  const config = readConfig();
  if (safeStorage.isEncryptionAvailable()) {
    config.deviceTokenEncrypted = safeStorage.encryptString(rawToken).toString('base64');
  } else {
    // Zaxira: shifrlash mavjud emas (masalan ba'zi Linux muhitlarida
    // keyring o'rnatilmagan) — bunday holat kamdan-kam uchraydi, lekin
    // ilova umuman ishlamay qolmasligi uchun oddiy saqlaymiz.
    config.deviceTokenEncrypted = Buffer.from(rawToken, 'utf-8').toString('base64');
  }
  writeConfig(config);
}

export function clearDeviceToken(): void {
  const config = readConfig();
  config.deviceTokenEncrypted = null;
  writeConfig(config);
}

export function hasDeviceToken(): boolean {
  return readConfig().deviceTokenEncrypted !== null;
}
