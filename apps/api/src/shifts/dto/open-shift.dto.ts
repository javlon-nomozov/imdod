import { IsInt, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  /** Qurilmada generatsiya qilingan uuid — oflaynda ochilgan smena qayta yuborilsa ham dublikat bo'lmasligi uchun. */
  @IsString()
  id!: string;

  @IsString()
  registerId!: string;

  @IsInt()
  @Min(0)
  openingCash!: number;
}
