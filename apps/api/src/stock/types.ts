import type { StockMovementType } from '@imdod/core';
import type { Prisma } from '@prisma/client';

export type PrismaTx = Prisma.TransactionClient;

export interface RecordMovementInput {
  /** Chaqiruvchi tomondan beriladigan uuidv7 (offline hujjatlar bilan bir xil naqsh). */
  id: string;
  productId: string;
  type: StockMovementType;
  /** Miqdor o'zgarishi, mingdan bir ulushda. Kirim musbat, sotuv manfiy. */
  qtyDelta: number;
  unitCost?: number;
  refType?: string;
  refId?: string;
  registerId?: string;
  userId?: string;
  occurredAt: Date;
  note?: string;
}
