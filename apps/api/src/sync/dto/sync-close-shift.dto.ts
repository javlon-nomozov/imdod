import { IsString } from 'class-validator';
import { CloseShiftDto } from '../../shifts/dto/close-shift.dto';

export class SyncCloseShiftDto extends CloseShiftDto {
  @IsString()
  closedById!: string;
}
