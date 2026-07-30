import { IsString } from 'class-validator';

export class ScanQueryDto {
  @IsString()
  code!: string;
}
