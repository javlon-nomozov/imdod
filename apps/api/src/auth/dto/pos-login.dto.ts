import { IsString, Length } from 'class-validator';

export class PosLoginDto {
  @IsString()
  @Length(4, 8)
  pin!: string;
}
