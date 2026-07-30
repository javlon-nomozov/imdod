import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UNITS, type Unit } from '@imdod/core';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  nameUz?: string;

  @IsOptional()
  @IsString()
  nameRu?: string;

  @IsOptional()
  @IsIn(UNITS)
  unit?: Unit;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
