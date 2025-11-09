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
  product: CartItemDto;
}

export class UpdateCartDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  products: CartItemDto[];
}

export class CartResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: { $ref: '#/components/schemas/CartItemDto' },
        },
        user_id: { type: 'string' },
      },
    },
  })
  items: { products: CartItemDto[]; user_id: string }[];
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

  @ApiProperty({ type: [Object], required: true })
  @IsArray()
  variants: any[];
}
