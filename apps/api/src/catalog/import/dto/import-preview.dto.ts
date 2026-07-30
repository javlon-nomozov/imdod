import { IsOptional, IsString } from 'class-validator';

export class ImportPreviewDto {
  /** AI javobidan to'g'ridan-to'g'ri nusxalab yopishtirilgan CSV matni. */
  @IsOptional()
  @IsString()
  text?: string;
}
