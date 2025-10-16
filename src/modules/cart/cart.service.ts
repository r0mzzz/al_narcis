import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import { AddToCartDto } from './dto/cart-ops.dto';

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
        _id, // include _id if required by CartItemDto
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

      const productToAdd = {
        _id,
        productId,
        productName,
        productDesc,
        productImage,
        productType,
        category,
        gender,
        brand,
        variants,
        count: dto.product.count ?? 1,
        user_id: dto.user_id, // ensure user_id is included in each product
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
        this.logger.log(`Cart before add: ${JSON.stringify(cart.products)}`);
        // Check for same productId and variants (deep equality)
        const idx = cart.products.findIndex((i) => {
          const match =
            i.productId === productToAdd.productId &&
            deepEqualVariants(i.variants, productToAdd.variants);
          this.logger.log(
            `Comparing to cart product: ${JSON.stringify(i)}. Match: ${match}`,
          );
          return match;
        });
        this.logger.log(`Index found: ${idx}`);
        if (idx > -1) {
          // Increase count if already exists
          cart.products[idx].count =
            (cart.products[idx].count ?? 1) + (dto.product.count ?? 1);
          this.logger.log(
            `Increased count for existing product: ${JSON.stringify(
              cart.products[idx],
            )}`,
          );
        } else {
          cart.products.push(productToAdd);
          this.logger.log(
            `Added new product to cart: ${JSON.stringify(productToAdd)}`,
          );
        }
        this.logger.log(`Cart after add: ${JSON.stringify(cart.products)}`);
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
}
