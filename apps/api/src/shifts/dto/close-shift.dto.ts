import { IsInt, Min } from 'class-validator';

export class CloseShiftDto {
  @IsInt()
  @Min(0)
  closingCash!: number;
}
