import { BadRequestException, Injectable } from '@nestjs/common';
import { normalizeProductName, similarity, toQty, toSum, UNITS, type Unit } from '@imdod/core';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../../stock/stock.service';
import type { ImportCommitItemDto } from './dto/import-commit-item.dto';
import type {
  ImportCommitResult,
  ImportRowParsed,
  ImportRowPreview,
  ImportSuggestion,
} from './import.types';
import type { ParsedRow } from './parse.service';

const SUGGESTION_THRESHOLD = 0.5;
const MAX_SUGGESTIONS = 5;

interface NormalizedProduct {
  id: string;
  nameUz: string;
  nameRu: string;
  normalizedUz: string;
  normalizedRu: string;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async preview(rows: ParsedRow[]): Promise<ImportRowPreview[]> {
    const activeProducts = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, nameUz: true, nameRu: true },
    });
    const normalizedProducts: NormalizedProduct[] = activeProducts.map((p) => ({
      ...p,
      normalizedUz: normalizeProductName(p.nameUz),
      normalizedRu: normalizeProductName(p.nameRu),
    }));

    return rows.map((row) => this.previewRow(row, normalizedProducts));
  }

  private previewRow(row: ParsedRow, products: NormalizedProduct[]): ImportRowPreview {
    const errors: string[] = [];

    if (!row.nameUz) errors.push('Mahsulot nomi (nomi_uz) yo‘q');
    if (!UNITS.includes(row.unit as Unit)) {
      errors.push(
        `Noto‘g‘ri o‘lchov birligi: "${row.unit}" (${UNITS.join(', ')} dan biri bo‘lishi kerak)`,
      );
    }
    if (row.costPrice === undefined || row.costPrice < 0) {
      errors.push('Tan narxi (tan_narxi) noto‘g‘ri yoki yo‘q');
    }
    if (row.retailPrice === undefined || row.retailPrice < 0) {
      errors.push('Dona narxi (dona_narxi) noto‘g‘ri yoki yo‘q');
    }

    if (errors.length > 0) {
      return { rowNumber: row.rowNumber, parsed: null, errors, suggestions: [] };
    }

    const parsed: ImportRowParsed = {
      rowNumber: row.rowNumber,
      nameUz: row.nameUz,
      nameRu: row.nameRu,
      unit: row.unit as Unit,
      categoryName: row.categoryName,
      costPrice: toSum(row.costPrice as number),
      retailPrice: toSum(row.retailPrice as number),
      wholesalePrice: row.wholesalePrice !== undefined ? toSum(row.wholesalePrice) : undefined,
      barcodes: row.barcodes,
      qty: row.qty !== undefined ? toQty(row.qty) : undefined,
    };

    const normalizedIncoming = normalizeProductName(row.nameUz);
    const suggestions: ImportSuggestion[] = products
      .map((p) => ({
        productId: p.id,
        nameUz: p.nameUz,
        nameRu: p.nameRu,
        score: Math.max(
          similarity(normalizedIncoming, p.normalizedUz),
          similarity(normalizedIncoming, p.normalizedRu),
        ),
      }))
      .filter((s) => s.score >= SUGGESTION_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    return { rowNumber: row.rowNumber, parsed, errors: [], suggestions };
  }

  async commit(items: ImportCommitItemDto[], userId: string): Promise<ImportCommitResult> {
    const result: ImportCommitResult = { created: 0, merged: 0, skipped: 0 };

    for (const item of items) {
      if (item.action === 'skip') {
        result.skipped++;
        continue;
      }

      if (item.action === 'create') {
        if (
          !item.nameUz ||
          !item.unit ||
          item.costPrice === undefined ||
          item.retailPrice === undefined
        ) {
          throw new BadRequestException(
            `Qator ${item.rowNumber}: "create" uchun nameUz/unit/costPrice/retailPrice majburiy`,
          );
        }
        if (!UNITS.includes(item.unit as Unit)) {
          throw new BadRequestException(
            `Qator ${item.rowNumber}: noto‘g‘ri o‘lchov birligi "${item.unit}"`,
          );
        }
        await this.createProduct(item, item.unit as Unit, userId);
        result.created++;
        continue;
      }

      // action === 'merge'
      if (!item.productId) {
        throw new BadRequestException(`Qator ${item.rowNumber}: "merge" uchun productId majburiy`);
      }
      await this.mergeIntoProduct(item, userId);
      result.merged++;
    }

    return result;
  }

  private async createProduct(
    item: ImportCommitItemDto,
    unit: Unit,
    userId: string,
  ): Promise<void> {
    const nameUz = item.nameUz as string;
    const costPrice = item.costPrice as number;
    const retailPrice = item.retailPrice as number;

    await this.prisma.$transaction(async (tx) => {
      let categoryId: string | undefined;
      if (item.categoryName) {
        const existing = await tx.category.findFirst({ where: { nameUz: item.categoryName } });
        categoryId = existing
          ? existing.id
          : (
              await tx.category.create({
                data: { nameUz: item.categoryName, nameRu: item.categoryName },
              })
            ).id;
      }

      const product = await tx.product.create({
        data: {
          nameUz,
          nameRu: item.nameRu ?? nameUz,
          unit,
          categoryId,
          costPrice,
          retailPrice,
          wholesalePrice: item.wholesalePrice ?? 0,
        },
      });

      if (item.barcodes && item.barcodes.length > 0) {
        await tx.barcode.createMany({
          data: item.barcodes.map((code, i) => ({
            productId: product.id,
            code,
            isPrimary: i === 0,
          })),
        });
      }

      if (item.qty && item.qty > 0) {
        await this.stock.recordMovement(
          {
            id: uuidv7(),
            productId: product.id,
            type: 'RECEIPT',
            qtyDelta: item.qty,
            unitCost: costPrice,
            refType: 'IMPORT',
            userId,
            occurredAt: new Date(),
          },
          tx,
        );
      }
    });
  }

  /**
   * ⚠️ Mavjud mahsulotning `nameUz`/`nameRu`siga ATAYLAB tegilmaydi —
   * import qatoridagi nom boshqacha yozilgan bo'lishi mumkin (masalan
   * kirill/lotin farqi), lekin eski nom saqlanib qolishi kerak.
   * Faqat miqdor qo'shiladi va yangi shtrix-kodlar biriktiriladi.
   */
  private async mergeIntoProduct(item: ImportCommitItemDto, userId: string): Promise<void> {
    const productId = item.productId as string;

    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new BadRequestException(`Qator ${item.rowNumber}: mahsulot topilmadi (${productId})`);
      }

      if (item.barcodes && item.barcodes.length > 0) {
        const existing = await tx.barcode.findMany({
          where: { productId, code: { in: item.barcodes } },
          select: { code: true },
        });
        const existingCodes = new Set(existing.map((b) => b.code));
        const newCodes = item.barcodes.filter((code) => !existingCodes.has(code));
        if (newCodes.length > 0) {
          await tx.barcode.createMany({
            data: newCodes.map((code) => ({ productId, code, isPrimary: false })),
          });
        }
      }

      if (item.qty && item.qty > 0) {
        await this.stock.recordMovement(
          {
            id: uuidv7(),
            productId,
            type: 'RECEIPT',
            qtyDelta: item.qty,
            unitCost: item.unitCost ?? product.costPrice,
            refType: 'IMPORT',
            userId,
            occurredAt: new Date(),
          },
          tx,
        );
      }
    });
  }
}
