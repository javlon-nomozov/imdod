import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SyncChangesQueryDto {
  /** So'nggi ko'rilgan `ChangeLog.seq`. `0` — birinchi sinxronizatsiya (to'liq snapshot). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
