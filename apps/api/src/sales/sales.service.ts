import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { computeCart, computePayment, formatReceiptNumber, type CartLineInput } from '@imdod/core';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { StockService } from '../stock/stock.service';
import type { CreateSaleDto } from './dto/create-sale.dto';

type SaleWithDetails = Prisma.SaleGetPayload<{ include: { lines: true; payments: true } }>;

export interface SaleActor {
  userId: string;
  registerId: string;
  deviceId: string;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shifts: ShiftsService,
    private readonly stock: StockService,
  ) {}

  async createSale(dto: CreateSaleDto, actor: SaleActor): Promise<SaleWithDetails> {
    const shift = await this.shifts.assertOpenShift(dto.shiftId, actor.registerId);

    // Mijoz yuborgan unitPrice/costPrice/priceType — narx snapshoti,
    // joriy katalogdan QAYTA OLINMAYDI. `computeCart` faqat arifmetikani
    // tasdiqlaydi/hisoblaydi (chegirma taqsimoti, foyda va h.k.).
    const cartLines: CartLineInput[] = dto.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      name: line.name,
      unit: line.unit,
      qty: line.qty,
      unitPrice: line.unitPrice,
      priceType: line.priceType,
      costPrice: line.costPrice,
      discountPercent: line.discountPercent,
    }));
    const cart = computeCart(cartLines, dto.cartDiscount);

    const payment = computePayment(
      cart.totals.total,
      dto.payments.map((p) => ({ method: p.method, amount: p.amount })),
    );

    const debtAmount = dto.payments
      .filter((p) => p.method === 'DEBT')
      .reduce((acc, p) => acc + p.amount, 0);

    if (debtAmount > 0 && !dto.customerId) {
      throw new BadRequestException('Nasiya to‘lovi uchun mijoz ko‘rsatilishi shart');
    }
    if (payment.outstanding > debtAmount) {
      throw new BadRequestException('To‘lov yetarli emas');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Kassa kodi bo'yicha chek raqami — atomik oshirish (bitta
        // tranzaksiya ichida, shuning uchun ikkita parallel savdo
        // bir xil raqamni ololmaydi).
        const register = await tx.register.update({
          where: { id: actor.registerId },
          data: { lastReceiptSeq: { increment: 1 } },
        });
        const number = formatReceiptNumber(register.code, register.lastReceiptSeq);
        const occurredAt = new Date(dto.occurredAt);

        const sale = await tx.sale.create({
          data: {
            id: dto.id,
            number,
            registerId: actor.registerId,
            shiftId: shift.id,
            cashierId: actor.userId,
            customerId: dto.customerId,
            grossAmount: cart.totals.gross,
            lineDiscount: cart.totals.lineDiscount,
            cartDiscount: cart.totals.cartDiscount,
            totalAmount: cart.totals.total,
            cashRounding: payment.cashRounding,
            profit: cart.totals.profit,
            occurredAt,
            lines: {
              create: cart.lines.map((line) => ({
                id: uuidv7(),
                productId: line.productId,
                nameSnapshot: line.name,
                unit: line.unit,
                qty: line.qty,
                unitPrice: line.unitPrice,
                priceType: line.priceType,
                discountPercent: line.discountPercent ?? 0,
                lineDiscount: line.lineDiscount,
                totalAmount: line.total,
                costPrice: line.costPrice,
                profit: line.profit,
              })),
            },
            payments: {
              create: dto.payments.map((p) => ({
                id: uuidv7(),
                method: p.method,
                amount: p.amount,
              })),
            },
          },
          include: { lines: true, payments: true },
        });

        for (const line of cart.lines) {
          await this.stock.recordMovement(
            {
              id: uuidv7(),
              productId: line.productId,
              type: 'SALE',
              qtyDelta: -line.qty,
              unitCost: line.costPrice,
              refType: 'SALE',
              refId: sale.id,
              registerId: actor.registerId,
              userId: actor.userId,
              occurredAt,
            },
            tx,
          );
        }

        if (debtAmount > 0 && dto.customerId) {
          await tx.debtTransaction.create({
            data: {
              id: uuidv7(),
              customerId: dto.customerId,
              type: 'CHARGE',
              amount: debtAmount,
              saleId: sale.id,
              userId: actor.userId,
              occurredAt,
            },
          });
        }

        return sale;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Idempotentlik: bir xil `dto.id` bilan qayta yuborilgan (masalan
        // tarmoq uzilib qayta yuborilgan). Butun tranzaksiya atomik
        // bo'lgani uchun to'qnashuv = yarim yozilgan qator yo'qligini
        // kafolatlaydi — mavjud savdoni qaytaramiz.
        return this.getSaleOrThrow(dto.id);
      }
      throw err;
    }
  }

  getSale(id: string): Promise<SaleWithDetails | null> {
    return this.prisma.sale.findUnique({ where: { id }, include: { lines: true, payments: true } });
  }

  private async getSaleOrThrow(id: string): Promise<SaleWithDetails> {
    const sale = await this.getSale(id);
    if (!sale) throw new ConflictException('Savdo id to‘qnashdi, lekin mavjud yozuv topilmadi');
    return sale;
  }
}
