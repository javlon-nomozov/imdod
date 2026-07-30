import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AttachBarcodeDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
