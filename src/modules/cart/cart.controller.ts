import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, RemoveFromCartDto } from './dto/cart-ops.dto';
import { UpdateCartItemCountDto } from './dto/update-cart-item-count.dto';
import { SetDiscountDto } from './dto/set-discount.dto';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('cart')
@UseGuards(AdminOrUserGuard)
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

  @Patch('discount')
  async setDiscount(@Body() dto: SetDiscountDto) {
    return this.cartService.setDiscount(dto.user_id, dto.discount);
  }

  // Admin: create discount (global or user)
  @Post('discounts')
  async createDiscount(@Body() dto: CreateDiscountDto) {
    return this.cartService.createDiscount(dto);
  }

  // Admin: list all discounts
  @Get('discounts')
  async listDiscounts() {
    return this.cartService.listDiscounts();
  }

  // Admin: update discount
  @Patch('discounts/:id')
  async updateDiscount(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.cartService.updateDiscount(id, dto as any);
  }

  // Admin: delete discount
  @Delete('discounts/:id')
  async deleteDiscount(@Param('id') id: string) {
    return this.cartService.deleteDiscount(id);
  }
}
