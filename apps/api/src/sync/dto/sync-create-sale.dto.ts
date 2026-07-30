import { IsString } from 'class-validator';
import { CreateSaleDto } from '../../sales/dto/create-sale.dto';

/**
 * Qurilma oflaynda yig'ilgan savdoni push qilganda ishlatadi. JWT yo'q —
 * shuning uchun kassir kim ekanini (`cashierId`) qurilma o'zi aniq yozadi;
 * server bu foydalanuvchi haqiqatan faol ekanini tekshiradi.
 */
export class SyncCreateSaleDto extends CreateSaleDto {
  @IsString()
  cashierId!: string;
}
