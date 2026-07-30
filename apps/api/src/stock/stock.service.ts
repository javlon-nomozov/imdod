import { Injectable } from '@nestjs/common';
import type { StockMovement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PrismaTx, RecordMovementInput } from './types';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ombor harakatini yozadi (append-only) va `StockBalance` keshini
   * o'shancha o'zgartiradi. `tx` ixtiyoriy — `SalesModule` kabi
   * chaqiruvchilar o'z tranzaksiyasi ichida berishi mumkin, aks holda
   * `PrismaService`ning o'zi ishlatiladi.
   */
  async recordMovement(
    input: RecordMovementInput,
    tx: PrismaTx | PrismaService = this.prisma,
  ): Promise<void> {
    await tx.stockMovement.create({
      data: {
        id: input.id,
        productId: input.productId,
        type: input.type,
        qtyDelta: input.qtyDelta,
        unitCost: input.unitCost ?? 0,
        refType: input.refType,
        refId: input.refId,
        registerId: input.registerId,
        userId: input.userId,
        occurredAt: input.occurredAt,
        note: input.note,
      },
    });

    await tx.stockBalance.upsert({
      where: { productId: input.productId },
      update: { qty: { increment: input.qtyDelta } },
      create: { productId: input.productId, qty: input.qtyDelta },
    });
  }

  /**
   * Qoldiqni ledger yig'indisidan TO'LIQ qayta hisoblaydi — kesh
   * buzilgan yoki hali mavjud bo'lmagan holatlarni ta'mirlash uchun.
   */
  async recalculateBalance(productId: string): Promise<number> {
    const result = await this.prisma.stockMovement.aggregate({
      where: { productId },
      _sum: { qtyDelta: true },
    });
    const qty = result._sum.qtyDelta ?? 0;

    await this.prisma.stockBalance.upsert({
      where: { productId },
      update: { qty },
      create: { productId, qty },
    });

    return qty;
  }

  async getBalance(productId: string): Promise<number> {
    const balance = await this.prisma.stockBalance.findUnique({ where: { productId } });
    return balance?.qty ?? 0;
  }

  listMovements(productId: string, take = 50, skip = 0): Promise<StockMovement[]> {
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { receivedAt: 'desc' },
      take,
      skip,
    });
  }
}
