import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ImportCommitItemDto } from './import-commit-item.dto';

export class ImportCommitDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportCommitItemDto)
  items!: ImportCommitItemDto[];
}
