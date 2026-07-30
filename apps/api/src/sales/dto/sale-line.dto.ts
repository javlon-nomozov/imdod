import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PRICE_TYPES, UNITS, type PriceType, type Unit } from '@imdod/core';

export class SaleLineDto {
  /** Qurilmada generatsiya qilingan barqaror ID (offline uchun). */
  @IsString()
  id!: string;

  @IsString()
  productId!: string;

  /** Chek va tarix uchun nom nusxasi. */
  @IsString()
  name!: string;

  @IsIn(UNITS)
  unit!: Unit;

  /** Miqdor, mingdan bir ulushda. */
  @IsInt()
  @Min(1)
  qty!: number;

  @IsInt()
  @Min(0)
  unitPrice!: number;

  @IsIn(PRICE_TYPES)
  priceType!: PriceType;

  /** Tan narxi nusxasi — foyda hisobi uchun. */
  @IsInt()
  @Min(0)
  costPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercent?: number;
}
