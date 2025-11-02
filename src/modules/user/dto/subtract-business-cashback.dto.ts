import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubtractBusinessCashbackDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
