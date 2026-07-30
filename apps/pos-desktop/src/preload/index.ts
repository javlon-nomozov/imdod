import { contextBridge, ipcRenderer } from 'electron';

export interface DeviceConfigResult {
  apiBaseUrl: string;
  hasDeviceToken: boolean;
  /** Faqat ishga tushganda, bir marta beriladi — renderer xotirasida saqlaydi. */
  deviceToken: string | null;
}

export interface SaveFileResult {
  saved: boolean;
  path?: string;
}

const imdodApi = {
  getConfig: (): Promise<DeviceConfigResult> => ipcRenderer.invoke('config:get'),
  setApiBaseUrl: (url: string): Promise<void> => ipcRenderer.invoke('config:set-api-base-url', url),
  setDeviceToken: (token: string): Promise<void> =>
    ipcRenderer.invoke('config:set-device-token', token),
  clearDeviceToken: (): Promise<void> => ipcRenderer.invoke('config:clear-device-token'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  printPreview: (html: string): Promise<void> => ipcRenderer.invoke('print:preview', html),
  saveFile: (bytes: Uint8Array, suggestedName: string): Promise<SaveFileResult> =>
    ipcRenderer.invoke('file:save', { bytes: Array.from(bytes), suggestedName }),
};

export type ImdodApi = typeof imdodApi;

contextBridge.exposeInMainWorld('imdod', imdodApi);
