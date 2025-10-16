import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import { AddToCartDto, RemoveFromCartDto } from './dto/cart-ops.dto';

function deepEqualVariants(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  // Sort arrays by a stable key (e.g., _id or capacity+price)
  const sortFn = (v: any) =>
    `${v._id || ''}_${v.capacity || ''}_${v.price || ''}`;
  const aSorted = [...a].sort((v1, v2) => sortFn(v1).localeCompare(sortFn(v2)));
  const bSorted = [...b].sort((v1, v2) => sortFn(v1).localeCompare(sortFn(v2)));
  return aSorted.every((variantA, idx) => {
    const variantB = bSorted[idx];
    const keysA = Object.keys(variantA);
    const keysB = Object.keys(variantB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => variantA[key] === variantB[key]);
  });
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  constructor(@InjectModel(Cart.name) private cartModel: Model<Cart>) {}

  async addToCart(dto: AddToCartDto) {
    try {
      if (!dto.product) {
        this.logger.error(
          `addToCart called without product. user_id=${dto.user_id}`,
        );
        throw new BadRequestException('Missing required field: product');
      }
      this.logger.log(
        `Adding to cart for user_id=${dto.user_id}, productId=${dto.product.productId}`,
      );
      let cart = await this.cartModel.findOne({ user_id: dto.user_id });
      const {
        productId,
        productName,
        productDesc,
        productImage,
        productType,
        category,
        gender,
        brand,
        variants,
      } = dto.product;

      // Find if product with same productId exists
      const productIdx = cart?.products.findIndex(
        (p) => p.productId === productId,
      );
      if (cart && productIdx > -1) {
        // Product exists, update variants
        const cartProduct = cart.products[productIdx];
        variants.forEach((incomingVariant) => {
          const variantIdx = cartProduct.variants.findIndex(
            (v) =>
              v.capacity === incomingVariant.capacity &&
              v.price === incomingVariant.price &&
              (!v._id || !incomingVariant._id || v._id === incomingVariant._id),
          );
          if (variantIdx > -1) {
            // Variant exists, increase count
            cartProduct.variants[variantIdx].count =
              (cartProduct.variants[variantIdx].count ?? 0) +
              (incomingVariant.count ?? 1);
          } else {
            // New variant, add to variants array
            cartProduct.variants.push({ ...incomingVariant });
          }
        });
        // Update other product fields if needed
        cart.products[productIdx] = {
          ...cartProduct,
          productName,
          productDesc,
          productImage,
          productType,
          category,
          gender,
          brand,
        };
        this.logger.log(
          `Updated product variants in cart for user_id=${dto.user_id}, productId=${productId}`,
        );
      } else {
        // Product does not exist, add as new
        const productToAdd = {
          productId,
          productName,
          productDesc,
          productImage,
          productType,
          category,
          gender,
          brand,
          variants: variants.map((v) => ({ ...v })),
          user_id: dto.user_id,
        };
        if (!cart) {
          cart = new this.cartModel({
            user_id: dto.user_id,
            products: [productToAdd],
          });
          this.logger.log(
            `Cart did not exist. Created new cart with product: ${JSON.stringify(
              productToAdd,
            )}`,
          );
        } else {
          cart.products.push(productToAdd);
          this.logger.log(
            `Added new product to cart: ${JSON.stringify(productToAdd)}`,
          );
        }
      }
      await cart.save();
      return this.getCart(dto.user_id);
    } catch (error) {
      this.logger.error(
        `Failed to add to cart for user_id=${dto.user_id}, productId=${
          dto.product?.productId
        }: ${error?.message || error}`,
      );
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

  async deleteCart(user_id: string) {
    const result = await this.cartModel.deleteOne({ user_id });
    if (result.deletedCount === 0) {
      this.logger.warn(`No cart found to delete for user_id=${user_id}`);
      return { success: false, message: 'Cart not found' };
    }
    this.logger.log(`Deleted cart for user_id=${user_id}`);
    return { success: true };
  }

  async removeItemFromCart(dto: RemoveFromCartDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) {
      this.logger.warn(`No cart found for user_id=${dto.user_id}`);
      return { success: false, message: 'Cart not found' };
    }
    const initialLength = cart.products.length;
    cart.products = cart.products.filter(
      (item) =>
        !(
          item.productId === dto.productId &&
          deepEqualVariants(item.variants, dto.variants)
        ),
    );
    if (cart.products.length === initialLength) {
      this.logger.warn(
        `No matching product found to remove for user_id=${dto.user_id}, _id=${dto.productId}`,
      );
      return { success: false, message: 'Product not found in cart' };
    }
    await cart.save();
    this.logger.log(
      `Removed product _id=${dto.productId} from cart for user_id=${dto.user_id}`,
    );
    return this.getCart(dto.user_id);
  }
}
