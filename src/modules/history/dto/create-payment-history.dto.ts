import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreatePaymentHistoryDto {
  @IsNotEmpty({ message: 'Məbləğ tələb olunur' })
  @IsNumber({}, { message: 'Məbləğ rəqəm olmalıdır' })
  @Min(1, { message: 'Məbləğ müsbət olmalıdır' })
  amount: number;

  @IsNotEmpty({ message: 'Status tələb olunur' })
  @IsString({ message: 'Status sətir olmalıdır' })
  status: string;

  @IsNotEmpty({ message: 'Məhsul ID-si tələb olunur' })
  @IsString({ message: 'Məhsul ID-si sətir olmalıdır' })
  productId: string;

  @IsNotEmpty({ message: 'İstifadəçi ID-si tələb olunur' })
  @IsString({ message: 'İstifadəçi ID-si sətir olmalıdır' })
  userId: string;

  @IsNotEmpty({ message: 'Məhsul adı tələb olunur' })
  @IsString({ message: 'Məhsul adı sətir olmalıdır' })
  productName: string;
}
