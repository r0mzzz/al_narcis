import { Controller, Post, Get, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, RemoveFromCartDto } from './dto/cart-ops.dto';
import { UpdateCartItemCountDto } from './dto/update-cart-item-count.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Controller('cart')
@UseGuards(AccessTokenGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add')
  async addToCart(@Body() dto: AddToCartDto) {
    return this.cartService.addToCart(dto);
  }

  @Get()
  async getCart(@Query('user_id') user_id: string) {
    return this.cartService.getCart(user_id);
  }


  @Delete()
  async deleteCart(@Query('user_id') user_id: string) {
    return this.cartService.deleteCart(user_id);
  }


  @Delete('item')
  async removeItemFromCart(@Body() dto: RemoveFromCartDto) {
    return this.cartService.removeItemFromCart(dto);
  }

  @Patch('item/count')
  async updateCartItemCount(@Body() dto: UpdateCartItemCountDto) {
    return this.cartService.updateCartItemCount(dto);
  }
}
