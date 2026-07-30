import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type ImportAction = 'create' | 'merge' | 'skip';

/**
 * Bitta qator uchun qaror. `action`ga qarab boshqa maydonlar majburiy
 * bo'ladi — bu tekshiruv `ImportService.commit()` ichida qilinadi
 * (class-validator'ning shartli DTO naqshlaridan qochish uchun).
 */
export class ImportCommitItemDto {
  @IsIn(['create', 'merge', 'skip'])
  action!: ImportAction;

  @IsInt()
  rowNumber!: number;

  // --- `create` uchun ---
  @IsOptional()
  @IsString()
  nameUz?: string;

  @IsOptional()
  @IsString()
  nameRu?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  retailPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsArray()
  barcodes?: string[];

  @IsOptional()
  @IsInt()
  qty?: number;

  // --- `merge` uchun ---
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCost?: number;
}
