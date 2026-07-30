import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CartDiscountDto } from './cart-discount.dto';
import { PaymentDto } from './payment.dto';
import { SaleLineDto } from './sale-line.dto';

export class CreateSaleDto {
  /** Qurilmada generatsiya qilingan uuidv7 — idempotentlik kaliti. */
  @IsString()
  id!: string;

  @IsString()
  shiftId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartDiscountDto)
  cartDiscount?: CartDiscountDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines!: SaleLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  /** Qurilma soati bo'yicha vaqt — server vaqti `receivedAt`da avtomatik yoziladi. */
  @IsDateString()
  occurredAt!: string;
}
