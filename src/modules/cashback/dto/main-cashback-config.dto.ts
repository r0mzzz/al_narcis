import { IsNumber, Min, Max } from 'class-validator';

export class MainCashbackConfigDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultPercent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  milestonePercent: number;

  @IsNumber()
  @Min(0)
  defaultThreshold: number;

  @IsNumber()
  @Min(0)
  milestoneThreshold: number;
}

