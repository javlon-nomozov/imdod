import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { computePayment } from '@imdod/core';
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
   */
  async openShift(registerId: string, userId: string, openingCash: number): Promise<Shift> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Register" WHERE id = ${registerId} FOR UPDATE`;

      const existing = await tx.shift.findFirst({ where: { registerId, status: 'OPEN' } });
      if (existing) {
        throw new ConflictException('Bu kassada allaqachon ochiq smena bor');
      }

      return tx.shift.create({
        data: {
          registerId,
          openedById: userId,
          openedAt: new Date(),
          openingCash,
        },
      });
    });
  }

  async closeShift(shiftId: string, userId: string, closingCash: number): Promise<Shift> {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Smena topilmadi');
    if (shift.status === 'CLOSED') throw new ConflictException('Smena allaqachon yopilgan');

    const expectedCash = await this.computeExpectedCash(
      shift.registerId,
      shift.id,
      shift.openingCash,
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

  /**
   * Kutilayotgan naqd = boshlang'ich naqd + (smena davomidagi naqd
   * to'lovlar − qaytimlar). `change` hech qayerda saqlanmaydi — har safar
   * `computePayment` (`@imdod/core`) orqali qayta hisoblanadi.
   *
   * Bilib turilgan cheklov: 1-bosqichda qaytarish (`SaleReturn`) yaratish
   * funksiyasi yo'q, shuning uchun formula qaytarishlarni hisobga olmaydi.
   * `DEBT` to'lovlari naqdga umuman ta'sir qilmaydi (to'g'ri chiqarib
   * tashlangan).
   */
  private async computeExpectedCash(
    registerId: string,
    shiftId: string,
    openingCash: number,
  ): Promise<number> {
    const sales = await this.prisma.sale.findMany({
      where: { shiftId, registerId, isVoided: false },
      include: { payments: true },
    });

    let cashNet = 0;
    for (const sale of sales) {
      const payment = computePayment(
        sale.totalAmount,
        sale.payments.map((p) => ({ method: p.method, amount: p.amount })),
      );
      const cashPaid = sale.payments
        .filter((p) => p.method === 'CASH')
        .reduce((acc, p) => acc + p.amount, 0);
      cashNet += cashPaid - payment.change;
    }

    return openingCash + cashNet;
  }
}
