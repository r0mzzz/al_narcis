import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class MainCashbackConfigDto {
  @ApiProperty({ example: 5, description: 'Default cashback percent (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultPercent: number;

  @ApiProperty({ example: 10, description: 'Milestone cashback percent (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  milestonePercent: number;

  @ApiProperty({ example: 1000, description: 'Default threshold for cashback milestone' })
  @IsNumber()
  @Min(0)
  defaultThreshold: number;

  @ApiProperty({ example: 5000, description: 'Milestone threshold for cashback' })
  @IsNumber()
  @Min(0)
  milestoneThreshold: number;
}
