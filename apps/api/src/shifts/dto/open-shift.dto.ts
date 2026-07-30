import { IsInt, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsString()
  registerId!: string;

  @IsInt()
  @Min(0)
  openingCash!: number;
}
