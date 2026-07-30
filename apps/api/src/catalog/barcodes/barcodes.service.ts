import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveScan, type ScanOutcome } from '@imdod/core';
import { Prisma, type Barcode, type Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BarcodesService {
  constructor(private readonly prisma: PrismaService) {}

  async attach(productId: string, code: string, isPrimary = false): Promise<Barcode> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const trimmed = code.trim();
    if (trimmed.length === 0)
      throw new BadRequestException('Shtrix-kod bo‘sh bo‘lishi mumkin emas');

    try {
      return await this.prisma.barcode.create({ data: { productId, code: trimmed, isPrimary } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Bu kod shu mahsulotga allaqachon biriktirilgan');
      }
      throw err;
    }
  }

  async detach(id: string): Promise<void> {
    const barcode = await this.prisma.barcode.findUnique({ where: { id } });
    if (!barcode) throw new NotFoundException('Shtrix-kod topilmadi');
    await this.prisma.barcode.delete({ where: { id } });
  }

  /**
   * Kodni qidiradi va `resolveScan` (`@imdod/core`) orqali kassir uchun
   * tushunarli holatga aylantiradi: `none` / `single` / `multiple`.
   * `Barcode.code` ataylab UNIQUE emas — bitta kod bir nechta mahsulotga
   * tegishli bo'lishi mumkin (kanstovarda generik kodlar odatiy hol).
   */
  async scan(code: string): Promise<ScanOutcome<Product>> {
    const barcodes = await this.prisma.barcode.findMany({
      where: { code: code.trim() },
      include: { product: true },
    });
    const products = barcodes.map((b) => b.product).filter((p) => p.isActive && !p.deletedAt);
    return resolveScan(code, products);
  }
}
