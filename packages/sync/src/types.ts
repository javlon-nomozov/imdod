export type ChangeOp = 'UPSERT' | 'DELETE';

/** `ChangeLog` jadvalidagi bitta yozuvning tashqi (API<->POS) shakli. */
export interface ChangeEnvelope {
  seq: number;
  entity: string;
  entityId: string;
  op: ChangeOp;
  payload: unknown;
  createdAt: string;
}

export interface SyncChangesResponse {
  changes: ChangeEnvelope[];
  cursor: number;
  /** `since=0` bo'lganda `true` — javob to'liq snapshot, ChangeLog tarixi emas. */
  isSnapshot: boolean;
}

/** PIN'ni lokal (Electron main-process) tekshirish uchun yetarli minimal foydalanuvchi maydonlari. */
export interface SyncUserSnapshot {
  id: string;
  fullName: string;
  role: string;
  pinHash: string;
  isActive: boolean;
}

export interface SyncRegisterSnapshot {
  id: string;
  code: string;
  lastReceiptSeq: number;
}
