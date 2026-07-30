import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

/** Faylni o'qishdan keyingi, hali validatsiya qilinmagan xom qator. */
export interface ParsedRow {
  rowNumber: number;
  nameUz: string;
  nameRu?: string;
  unit: string;
  categoryName?: string;
  costPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  barcodes: string[];
  qty?: number;
}

interface RawColumns {
  nomiUz?: string;
  nomiRu?: string;
  birlik?: string;
  kategoriya?: string;
  tanNarxi?: string;
  donaNarxi?: string;
  optomNarxi?: string;
  shtrixKodlar?: string;
  miqdor?: string;
}

const HEADER_MAP: Record<string, keyof RawColumns> = {
  nomi_uz: 'nomiUz',
  nomi_ru: 'nomiRu',
  birlik: 'birlik',
  kategoriya: 'kategoriya',
  tan_narxi: 'tanNarxi',
  dona_narxi: 'donaNarxi',
  optom_narxi: 'optomNarxi',
  shtrix_kodlar: 'shtrixKodlar',
  miqdor: 'miqdor',
};

/** Sarlavhani shablon kalitiga moslashtiradi: kichik harf, bo'shliq → pastki chiziqcha. */
function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function toParsedRow(raw: RawColumns, rowNumber: number): ParsedRow {
  return {
    rowNumber,
    nameUz: raw.nomiUz ?? '',
    nameRu: raw.nomiRu || undefined,
    unit: (raw.birlik ?? '').toUpperCase(),
    categoryName: raw.kategoriya || undefined,
    costPrice: parseNumber(raw.tanNarxi),
    retailPrice: parseNumber(raw.donaNarxi),
    wholesalePrice: parseNumber(raw.optomNarxi),
    barcodes: (raw.shtrixKodlar ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    qty: parseNumber(raw.miqdor),
  };
}

@Injectable()
export class ParseService {
  async parseXlsx(buffer: Buffer): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    // `exceljs`ning tip e'lonlari yangi @types/node'dagi generic
    // `Buffer<ArrayBufferLike>` bilan mos kelmaydi (faqat tiplarda —
    // ishlash vaqtida farq yo'q, ikkalasi ham xuddi shu obyekt).
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const columnIndex = new Map<number, keyof RawColumns>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const key = HEADER_MAP[normalizeHeader(String(cell.value ?? ''))];
      if (key) columnIndex.set(colNumber, key);
    });

    const rows: ParsedRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw: RawColumns = {};
      row.eachCell((cell, colNumber) => {
        const key = columnIndex.get(colNumber);
        if (!key) return;
        raw[key] =
          cell.value === null || cell.value === undefined ? undefined : String(cell.value).trim();
      });
      if (!raw.nomiUz) return;
      rows.push(toParsedRow(raw, rowNumber));
    });

    return rows;
  }

  parseCsvText(text: string): ParsedRow[] {
    const result = Papa.parse<Record<string, string>>(text.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => normalizeHeader(h),
    });

    const rows: ParsedRow[] = [];
    result.data.forEach((record, index) => {
      const raw: RawColumns = {};
      for (const [header, key] of Object.entries(HEADER_MAP)) {
        const value = record[header];
        if (value !== undefined) raw[key] = value.trim();
      }
      // 1-qator sarlavha, shuning uchun ma'lumot 2-qatordan boshlanadi.
      if (raw.nomiUz) rows.push(toParsedRow(raw, index + 2));
    });

    return rows;
  }
}
