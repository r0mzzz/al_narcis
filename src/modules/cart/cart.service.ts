import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import {
  AddToCartDto,
  RemoveFromCartDto,
  UpdateCartDto,
  UpdateCartItemDto,
} from './dto/cart-ops.dto';

function deepEqualVariants(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  // Compare each variant object
  return a.every((variantA, idx) => {
    const variantB = b[idx];
    const keysA = Object.keys(variantA);
    const keysB = Object.keys(variantB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => variantA[key] === variantB[key]);
  });
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {}

  async addToCart(dto: AddToCartDto) {
    try {
      this.logger.log(`Adding to cart for user_id=${dto.user_id}, productId=${dto.product.productId}`);
      let cart = await this.cartModel.findOne({ user_id: dto.user_id });
      const productToAdd = {
        ...dto.product,
        variants: dto.product.variants,
        quantity: dto.product.quantity ?? 1,
      };
      if (!cart) {
        cart = new this.cartModel({
          user_id: dto.user_id,
          products: [productToAdd],
        });
      } else {
        // Check for same productId and variants (deep equality)
        const idx = cart.products.findIndex(
          (i) =>
            i.productId === productToAdd.productId &&
            deepEqualVariants(i.variants, productToAdd.variants),
        );
        if (idx > -1) {
          // Increase quantity if already exists
          cart.products[idx].quantity = (cart.products[idx].quantity ?? 1) + (dto.product.quantity ?? 1);
        } else {
          cart.products.push(productToAdd);
        }
      }
      await cart.save();
      return this.getCart(dto.user_id);
    } catch (error) {
      this.logger.error(`Failed to add to cart for user_id=${dto.user_id}, productId=${dto.product.productId}: ${error?.message || error}`);
      throw error;
    }
  }

  async getCart(user_id: string) {
    const cart = await this.cartModel.findOne({ user_id });
    if (!cart) return { items: [] };
    return {
      items: [
        {
          products: cart.products,
          user_id: cart.user_id,
        },
      ],
    };
  }

  async updateCart(dto: UpdateCartDto) {
    let cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) {
      cart = new this.cartModel({
        user_id: dto.user_id,
        products: dto.products,
      });
    } else {
      cart.products = dto.products;
    }
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async updateCartItem(dto: UpdateCartItemDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) throw new NotFoundException('Cart not found');
    const idx = cart.products.findIndex(
      (i) =>
        i.productId === dto.productId &&
        deepEqualVariants(i.variants, dto.variants),
    );
    if (idx === -1) throw new NotFoundException('Cart item not found');
    // Update quantity
    cart.products[idx].quantity = dto.quantity;
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async removeItemFromCart(dto: RemoveFromCartDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) throw new NotFoundException('Cart not found');
    const before = cart.products.length;
    cart.products = cart.products.filter(
      (i) =>
        !(
          i.productId === dto.productId &&
          deepEqualVariants(i.variants, dto.variants)
        ),
    );
    if (cart.products.length === before)
      throw new NotFoundException('Cart item not found');
    await cart.save();
    return this.getCart(dto.user_id);
  }

  async deleteCart(user_id: string) {
    await this.cartModel.deleteOne({ user_id });
    return { success: true };
  }
}
