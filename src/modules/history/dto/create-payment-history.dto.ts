import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreatePaymentHistoryDto {
  @ApiProperty({ example: 100, description: 'Payment amount' })
  @IsNotEmpty({ message: 'Məbləğ tələb olunur' })
  @IsNumber({}, { message: 'Məbləğ rəqəm olmalıdır' })
  @Min(1, { message: 'Məbləğ müsbət olmalıdır' })
  amount: number;

  @ApiProperty({ example: 'SUCCESS', description: 'Payment status' })
  @IsNotEmpty({ message: 'Status tələb olunur' })
  @IsString({ message: 'Status sətir olmalıdır' })
  status: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    description: 'Product ID (MongoDB ObjectId)',
  })
  @IsNotEmpty({ message: 'Məhsul ID-si tələb olunur' })
  @IsString({ message: 'Məhsul ID-si sətir olmalıdır' })
  productId: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c86',
    description: 'User ID (MongoDB ObjectId)',
  })
  @IsNotEmpty({ message: 'İstifadəçi ID-si tələb olunur' })
  @IsString({ message: 'İstifadəçi ID-si sətir olmalıdır' })
  userId: string;

  @ApiProperty({ example: 'Perfume X', description: 'Product name' })
  @IsNotEmpty({ message: 'Məhsul adı tələb olunur' })
  @IsString({ message: 'Məhsul adı sətir olmalıdır' })
  productName: string;

  @ApiProperty({ example: '2023-10-10', description: 'Payment date' })
  @IsString({ message: 'Tarix sətir olmalıdır' })
  @IsOptional()
  date?: string;
}
