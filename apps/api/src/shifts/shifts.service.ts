import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { computeExpectedCash } from '@imdod/core';
import type { Shift } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bitta registerda bir vaqtning o'zida faqat bitta OPEN smena bo'lishi
   * mumkin. Sxemada bu qoidani ifodalovchi constraint yo'q (Prisma DSL'da
   * partial unique index yo'q), shuning uchun `Register` qatorini
   * `SELECT ... FOR UPDATE` bilan qulflab, tranzaksiya ichida tekshiramiz —
   * bu ikkita parallel "ochish" so'rovini serializatsiya qiladi.
   *
   * `id` chaqiruvchi tomondan beriladi (POS oflaynda ham smena ochishi
   * mumkin bo'lgani uchun). Idempotentlik tekshiruvi ("bu id bilan smena
   * allaqachon bormi") ATAYLAB "bitta ochiq smena" tekshiruvidan OLDIN
   * turadi — aks holda bir xil `id` bilan qayta yuborilgan (outbox
   * qayta urinishi) so'rov o'zining OLDIN yaratgan ochiq smenasiga
   * to'qnashib, xato qaytarardi.
   */
  async openShift(id: string, registerId: string, userId: string, openingCash: number): Promise<Shift> {
    return this.prisma.$transaction(async (tx) => {
      const alreadyCreated = await tx.shift.findUnique({ where: { id } });
      if (alreadyCreated) return alreadyCreated;

      await tx.$queryRaw`SELECT id FROM "Register" WHERE id = ${registerId} FOR UPDATE`;

      const existingOpen = await tx.shift.findFirst({ where: { registerId, status: 'OPEN' } });
      if (existingOpen) {
        throw new ConflictException('Bu kassada allaqachon ochiq smena bor');
      }

      return tx.shift.create({
        data: {
          id,
          registerId,
          openedById: userId,
          openedAt: new Date(),
          openingCash,
        },
      });
    });
  }

  /**
   * Smena allaqachon YOPILGAN bo'lsa xato bermaydi — shu holatni
   * qaytaradi. Bu outbox qayta yuborsa (tarmoq javobi yo'qolib, keyin
   * qayta urinilsa) xavfsiz bo'lishi uchun kerak; interaktiv UI'dan
   * kelgan haqiqiy ikkinchi marta yopish urinishi ham xuddi shunday
   * "allaqachon yopilgan" holatni ko'radi — bu ham to'g'ri xatti-harakat.
   */
  async closeShift(shiftId: string, userId: string, closingCash: number): Promise<Shift> {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Smena topilmadi');
    if (shift.status === 'CLOSED') return shift;

    const sales = await this.prisma.sale.findMany({
      where: { shiftId: shift.id, registerId: shift.registerId, isVoided: false },
      include: { payments: true },
    });
    const expectedCash = computeExpectedCash(
      shift.openingCash,
      sales.map((sale) => ({
        totalAmount: sale.totalAmount,
        payments: sale.payments.map((p) => ({ method: p.method, amount: p.amount })),
      })),
    );
    const variance = closingCash - expectedCash;

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedById: userId,
        closedAt: new Date(),
        closingCash,
        expectedCash,
        variance,
        status: 'CLOSED',
      },
    });
  }

  getCurrentShift(registerId: string): Promise<Shift | null> {
    return this.prisma.shift.findFirst({ where: { registerId, status: 'OPEN' } });
  }

  /** `SalesModule` savdo yaratishdan oldin smena ochiq va shu registerga tegishli ekanini shu orqali tekshiradi. */
  async assertOpenShift(shiftId: string, registerId: string): Promise<Shift> {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.registerId !== registerId || shift.status !== 'OPEN') {
      throw new ConflictException('Ochiq smena topilmadi');
    }
    return shift;
  }
}
