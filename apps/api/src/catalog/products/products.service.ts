import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsQueryDto } from './dto/list-products.query.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

type ProductWithBarcodes = Prisma.ProductGetPayload<{ include: { barcodes: true } }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto): Promise<ProductWithBarcodes> {
    return this.prisma.product.create({ data: dto, include: { barcodes: true } });
  }

  async findById(id: string): Promise<ProductWithBarcodes> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { barcodes: true },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithBarcodes> {
    await this.findById(id);
    return this.prisma.product.update({ where: { id }, data: dto, include: { barcodes: true } });
  }

  /** Yumshoq o'chirish — tarixiy cheklardagi nom nusxasi buzilmasligi uchun. */
  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async list(
    query: ListProductsQueryDto,
  ): Promise<{ items: ProductWithBarcodes[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { nameUz: { contains: query.search, mode: 'insensitive' as const } },
              { nameRu: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const take = query.limit ?? 50;
    const skip = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: { nameUz: 'asc' },
        include: { barcodes: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }
}
