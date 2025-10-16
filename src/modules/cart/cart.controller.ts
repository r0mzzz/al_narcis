import { Controller, Post, Get, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartDto, DeleteCartDto, RemoveFromCartDto, UpdateCartItemDto } from './dto/cart-ops.dto';
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

  @Patch()
  async updateCart(@Body() dto: UpdateCartDto) {
    return this.cartService.updateCart(dto);
  }

  @Delete()
  async deleteCart(@Query('user_id') user_id: string) {
    return this.cartService.deleteCart(user_id);
  }

  @Patch('item')
  async updateCartItem(@Body() dto: UpdateCartItemDto) {
    return this.cartService.updateCartItem(dto);
  }

  @Delete('item')
  async removeItemFromCart(@Body() dto: RemoveFromCartDto) {
    return this.cartService.removeItemFromCart(dto);
  }
}
