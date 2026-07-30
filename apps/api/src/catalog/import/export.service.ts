import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { IMPORT_TEMPLATE } from './import.template';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

interface ExportRow {
  nomi_uz: string;
  nomi_ru: string;
  birlik: string;
  kategoriya: string;
  tan_narxi: number;
  dona_narxi: number;
  optom_narxi: number;
  shtrix_kodlar: string;
  miqdor: string;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Joriy katalogni import shabloni bilan bir xil ustunlarda qaytaradi — tahrirlab qayta import qilish uchun. */
  async export(format: 'xlsx' | 'csv'): Promise<ExportResult> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { barcodes: true, category: true },
      orderBy: { nameUz: 'asc' },
    });

    const rows: ExportRow[] = products.map((p) => ({
      nomi_uz: p.nameUz,
      nomi_ru: p.nameRu,
      birlik: p.unit,
      kategoriya: p.category?.nameUz ?? '',
      tan_narxi: p.costPrice,
      dona_narxi: p.retailPrice,
      optom_narxi: p.wholesalePrice,
      shtrix_kodlar: p.barcodes.map((b) => b.code).join(','),
      miqdor: '',
    }));

    return format === 'csv' ? this.toCsv(rows) : await this.toXlsx(rows);
  }

  private toCsv(rows: ExportRow[]): ExportResult {
    const keys = IMPORT_TEMPLATE.columns.map((c) => c.key);
    const header = keys.join(',');
    const lines = rows.map((row) =>
      keys.map((key) => escapeCsvValue(String(row[key as keyof ExportRow]))).join(','),
    );
    const csv = [header, ...lines].join('\n');
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: 'katalog.csv',
      contentType: 'text/csv; charset=utf-8',
    };
  }

  private async toXlsx(rows: ExportRow[]): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Katalog');
    sheet.columns = IMPORT_TEMPLATE.columns.map((c) => ({ header: c.key, key: c.key }));
    sheet.addRows(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      filename: 'katalog.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
