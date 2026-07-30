import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ChangeEnvelope, SyncChangesResponse, SyncRegisterSnapshot, SyncUserSnapshot } from '@imdod/sync';
import type { Sale, Shift } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { ShiftsService } from '../shifts/shifts.service';
import type { DeviceContext } from '../auth/types/auth.types';
import type { SyncCloseShiftDto } from './dto/sync-close-shift.dto';
import type { SyncCreateSaleDto } from './dto/sync-create-sale.dto';
import type { SyncOpenShiftDto } from './dto/sync-open-shift.dto';

const DEFAULT_CHANGES_LIMIT = 500;

/** `ChangeLog`ga hozircha faqat shu spravochniklar yoziladi (4/5-bosqichda kengayadi). */
const SYNCED_ENTITIES = ['Product', 'Category', 'Barcode'] as const;

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly shifts: ShiftsService,
  ) {}

  async getRegisterSnapshot(registerId: string): Promise<SyncRegisterSnapshot> {
    const register = await this.prisma.register.findUnique({ where: { id: registerId } });
    if (!register) throw new NotFoundException('Kassa topilmadi');
    return { id: register.id, code: register.code, lastReceiptSeq: register.lastReceiptSeq };
  }

  async getUserSnapshots(): Promise<SyncUserSnapshot[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, fullName: true, role: true, pinHash: true, isActive: true },
    });
    return users;
  }

  async getChanges(since: number, limit = DEFAULT_CHANGES_LIMIT): Promise<SyncChangesResponse> {
    if (since === 0) {
      return this.getFullSnapshot();
    }

    const rows = await this.prisma.changeLog.findMany({
      where: { entity: { in: [...SYNCED_ENTITIES] }, seq: { gt: since } },
      orderBy: { seq: 'asc' },
      take: limit,
    });

    const changes: ChangeEnvelope[] = rows.map((row) => ({
      seq: Number(row.seq),
      entity: row.entity,
      entityId: row.entityId,
      op: row.op,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
    }));

    const cursor = changes.length > 0 ? changes[changes.length - 1]!.seq : since;
    return { changes, cursor, isSnapshot: false };
  }

  /**
   * Birinchi sinxronizatsiya: mavjud Category/Product (barcodes bilan)
   * holatidan sun'iy UPSERT yozuvlari tuziladi — `ChangeLog`da ular uchun
   * tarix yo'q (seed/import orqali kelgan).
   */
  private async getFullSnapshot(): Promise<SyncChangesResponse> {
    const maxSeqRow = await this.prisma.changeLog.aggregate({ _max: { seq: true } });
    const cursor = Number(maxSeqRow._max.seq ?? 0);

    const [categories, products] = await Promise.all([
      this.prisma.category.findMany(),
      this.prisma.product.findMany({ include: { barcodes: true } }),
    ]);

    const changes: ChangeEnvelope[] = [
      ...categories.map(
        (category): ChangeEnvelope => ({
          seq: 0,
          entity: 'Category',
          entityId: category.id,
          op: 'UPSERT',
          payload: category,
          createdAt: category.updatedAt.toISOString(),
        }),
      ),
      ...products.map(
        (product): ChangeEnvelope => ({
          seq: 0,
          entity: 'Product',
          entityId: product.id,
          op: 'UPSERT',
          payload: product,
          createdAt: product.updatedAt.toISOString(),
        }),
      ),
    ];

    return { changes, cursor, isSnapshot: true };
  }

  async createSale(dto: SyncCreateSaleDto, device: DeviceContext): Promise<Sale> {
    await this.assertActiveUser(dto.cashierId);
    return this.sales.createSale(dto, {
      userId: dto.cashierId,
      registerId: device.registerId,
      deviceId: device.id,
    });
  }

  async openShift(dto: SyncOpenShiftDto): Promise<Shift> {
    await this.assertActiveUser(dto.openedById);
    return this.shifts.openShift(dto.id, dto.registerId, dto.openedById, dto.openingCash);
  }

  async closeShift(shiftId: string, dto: SyncCloseShiftDto): Promise<Shift> {
    await this.assertActiveUser(dto.closedById);
    return this.shifts.closeShift(shiftId, dto.closedById, dto.closingCash);
  }

  /**
   * Oflayn push'da JWT yo'q — kelgan `cashierId`/`openedById`/`closedById`
   * haqiqatan faol foydalanuvchi ekanini shu yerda tekshiramiz.
   */
  private async assertActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new ForbiddenException('Foydalanuvchi faol emas yoki topilmadi');
    }
  }
}
