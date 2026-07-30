import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UNITS, type Unit } from '@imdod/core';

export class CreateProductDto {
  @IsString()
  nameUz!: string;

  @IsString()
  nameRu!: string;

  @IsIn(UNITS)
  unit!: Unit;

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

  @IsInt()
  @Min(0)
  costPrice!: number;

  @IsInt()
  @Min(0)
  retailPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;
}
