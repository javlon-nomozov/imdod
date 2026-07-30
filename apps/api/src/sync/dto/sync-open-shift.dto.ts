import { IsString } from 'class-validator';
import { OpenShiftDto } from '../../shifts/dto/open-shift.dto';

export class SyncOpenShiftDto extends OpenShiftDto {
  @IsString()
  openedById!: string;
}
