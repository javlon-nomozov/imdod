import { IsString } from 'class-validator';

export class ProvisionDeviceDto {
  /** K01, K02, ... — mavjud bo'lsa shu kassaga qo'shiladi, bo'lmasa yaratiladi. */
  @IsString()
  registerCode!: string;

  @IsString()
  registerName!: string;

  @IsString()
  deviceName!: string;
}
