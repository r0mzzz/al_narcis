import { IsNumber, Min, Max, IsString } from 'class-validator';

export class SetDiscountDto {
  @IsString()
  user_id: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discount: number; // percentage 0-100
}

