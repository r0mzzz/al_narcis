import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CartItemDto } from './cart-item.dto';

export class AddToCartDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ type: CartItemDto })
  @ValidateNested()
  @Type(() => CartItemDto)
  item: CartItemDto;

  @ApiProperty({ required: false })
  @IsString()
  size?: string;

  @ApiProperty({ required: false })
  @IsArray()
  variants?: any[];

  @ApiProperty({ required: false })
  @IsNumber()
  count?: number;
}

export class UpdateCartDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class DeleteCartDto {
  @ApiProperty()
  @IsString()
  user_id: string;
}

export class RemoveFromCartDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ required: false })
  @IsString()
  size?: string;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ required: false })
  @IsString()
  size?: string;

  @ApiProperty()
  @IsNumber()
  count: number;
}
