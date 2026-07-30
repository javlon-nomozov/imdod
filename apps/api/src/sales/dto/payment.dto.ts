import { IsIn, IsInt, Min } from 'class-validator';
import { PAYMENT_METHODS, type PaymentMethod } from '@imdod/core';

export class PaymentDto {
  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;

  @IsInt()
  @Min(0)
  amount!: number;
}
