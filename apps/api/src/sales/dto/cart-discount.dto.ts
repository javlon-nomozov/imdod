import { IsInt, IsOptional, Min } from 'class-validator';

export class CartDiscountDto {
  /** Yuzdan bir foizda: 1250 = 12.5%. */
  @IsOptional()
  @IsInt()
  @Min(0)
  percent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;
}
