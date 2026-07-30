import { Injectable } from '@nestjs/common';
import { type ChangeOp, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient | PrismaService;

/**
 * `Product`/`Category`/`Barcode` (va keyingi bosqichlarda `Customer` kabi
 * boshqa spravochnik) o'zgarganda shu yerga yoziladi — POS qurilmalari
 * `GET /sync/changes?since=` orqali shu jurnaldan o'z kursoridan keyingi
 * o'zgarishlarni tortib oladi. `payload` — o'zgargan qatorning TO'LIQ
 * nusxasi, shunda qurilma qo'shimcha so'rovsiz to'g'ridan-to'g'ri o'z
 * lokal bazasiga qo'llay oladi.
 */
@Injectable()
export class ChangeLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    entity: string,
    entityId: string,
    op: ChangeOp,
    payload: unknown,
    tx: Tx = this.prisma,
  ): Promise<{ seq: bigint }> {
    return tx.changeLog.create({
      data: { entity, entityId, op, payload: payload as Prisma.InputJsonValue },
      select: { seq: true },
    });
  }
}
