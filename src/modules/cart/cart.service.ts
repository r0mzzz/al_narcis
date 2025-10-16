import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import {
  AddToCartDto,
  RemoveFromCartDto,
  UpdateCartDto,
  UpdateCartItemDto,
} from './dto/cart-ops.dto';
import { CartItemDto } from './dto/cart-item.dto';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {}

  async addToCart(dto: AddToCartDto) {
    let cart = await this.cartModel.findOne({ user_id: dto.user_id });
    const itemToAdd = {
      ...dto.item,
      size: dto.size || dto.item.size,
      count: dto.count || dto.item.count || 1,
      variants: dto.variants || dto.item.variants,
    };
    if (!cart) {
      cart = new this.cartModel({ user_id: dto.user_id, items: [itemToAdd] });
    } else {
      // Check for same productId and size
      const idx = cart.items.findIndex(
        (i) =>
          i.productId === itemToAdd.productId &&
          (i.size || '').toLowerCase() === (itemToAdd.size || '').toLowerCase(),
      );
      if (idx > -1) {
        cart.items[idx].count =
          (cart.items[idx].count || 1) + (itemToAdd.count || 1);
      } else {
        cart.items.push(itemToAdd);
      }
    }
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async getCart(user_id: string) {
    const cart = await this.cartModel.findOne({ user_id });
    if (!cart) return { items: [], totalAmount: 0 };
    const totalAmount = cart.items.reduce((sum, i) => sum + (i.count || 1), 0);
    return { items: cart.items, totalAmount };
  }

  async updateCart(dto: UpdateCartDto) {
    let cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) {
      cart = new this.cartModel({ user_id: dto.user_id, items: dto.items });
    } else {
      cart.items = dto.items;
    }
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async updateCartItem(dto: UpdateCartItemDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) throw new NotFoundException('Cart not found');
    const idx = cart.items.findIndex(
      (i) =>
        i.productId === dto.productId &&
        (i.size || '').toLowerCase() === (dto.size || '').toLowerCase(),
    );
    if (idx === -1) throw new NotFoundException('Cart item not found');
    cart.items[idx].count = dto.count;
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async removeItemFromCart(dto: RemoveFromCartDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) throw new NotFoundException('Cart not found');
    const before = cart.items.length;
    cart.items = cart.items.filter(
      (i) =>
        !(
          i.productId === dto.productId &&
          (i.size || '').toLowerCase() === (dto.size || '').toLowerCase()
        ),
    );
    if (cart.items.length === before)
      throw new NotFoundException('Cart item not found');
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async deleteCart(user_id: string) {
    await this.cartModel.deleteOne({ user_id });
    return { success: true };
  }
}
