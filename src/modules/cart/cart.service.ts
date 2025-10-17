import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import { AddToCartDto, RemoveFromCartDto } from './dto/cart-ops.dto';
import { UpdateCartItemCountDto } from './dto/update-cart-item-count.dto';
import { MinioService } from '../../services/minio.service';

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
  // In-memory cache for presigned image URLs
  private static imageUrlCache: Map<string, { url: string; expiresAt: number }> = new Map();
  private static PRESIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    private readonly minioService: MinioService,
  ) {}

  private async getCachedPresignedUrl(imagePath: string): Promise<string> {
    const cacheEntry = CartService.imageUrlCache.get(imagePath);
    const now = Date.now();
    if (cacheEntry && cacheEntry.expiresAt > now) {
      return cacheEntry.url;
    }
    // Generate new presigned URL
    const url = await this.minioService.getPresignedUrl(imagePath);
    const expiresAt = now + CartService.PRESIGNED_URL_TTL_MS;
    CartService.imageUrlCache.set(imagePath, { url, expiresAt });
    return url;
  }

  async addToCart(dto: AddToCartDto) {
    try {
      if (!dto.product) {
        this.logger.error(
          `addToCart called without product. user_id=${dto.user_id}`,
        );
        throw new BadRequestException('Missing required field: product');
      }
      const { productId, variants } = dto.product;
      if (!variants || !Array.isArray(variants) || variants.length === 0) {
        throw new BadRequestException('Missing variants');
      }
      let cart = await this.cartModel.findOne({ user_id: dto.user_id });
      if (!cart) {
        cart = new this.cartModel({
          user_id: dto.user_id,
          products: [],
        });
      }
      // Check if product with same productId exists
      const productIdx = cart.products.findIndex(
        (p) => p.productId === productId,
      );
      if (productIdx > -1) {
        // Product exists, check for matching variant (by all relevant fields)
        let updated = false;
        const cartProduct = cart.products[productIdx];
        for (const incomingVariant of variants) {
          // Determine increment: prefer variant.count, then product.count, then 1
          const increment =
            typeof incomingVariant.count === 'number'
              ? incomingVariant.count
              : typeof dto.product.count === 'number'
              ? dto.product.count
              : 1;
          // Match by all relevant fields (capacity, price, _id if present)
          const variantIdx = cartProduct.variants.findIndex((v) => {
            return (
              v.capacity === incomingVariant.capacity &&
              v.price === incomingVariant.price &&
              (v._id ? v._id === incomingVariant._id : true)
            );
          });
          this.logger.log(
            `Incoming variant: ${JSON.stringify(
              incomingVariant,
            )}, increment: ${increment}`,
          );
          if (variantIdx > -1) {
            this.logger.log(
              `Found existing variant at index ${variantIdx}: ${JSON.stringify(
                cartProduct.variants[variantIdx],
              )}`,
            );
            // Variant exists, increase count
            cartProduct.variants[variantIdx].count =
              (cartProduct.variants[variantIdx].count ?? 0) + increment;
            this.logger.log(
              `Updated count: ${cartProduct.variants[variantIdx].count}`,
            );
            updated = true;
          } else {
            // New variant, add to variants array
            cartProduct.variants.push({ ...incomingVariant, count: increment });
            this.logger.log(
              `Added new variant: ${JSON.stringify({
                ...incomingVariant,
                count: increment,
              })}`,
            );
            updated = true;
          }
        }
        // Do not replace the subdocument with a spread; update in-place only
        // if (updated) {
        //   cart.products[productIdx] = {
        //     ...cartProduct,
        //   };
        // }
        this.logger.log(
          `Updated product/variant in cart for user_id=${dto.user_id}, productId=${productId}`,
        );
      } else {
        // Product does not exist, add as new
        const productToAdd = {
          ...dto.product,
          user_id: dto.user_id,
        };
        cart.products.push(productToAdd);
        this.logger.log(
          `Added new product to cart for user_id=${dto.user_id}, productId=${productId}`,
        );
      }
      await cart.save();
      // Reload cart to ensure latest data is returned
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
    const cart = await this.cartModel.findOne({ user_id }).lean();
    if (!cart) return { items: [] };
    const products = cart.products || [];
    // Use cached presigned URLs for product images
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let imageUrl = null;
        if (product.productImage) {
          imageUrl = await this.getCachedPresignedUrl(product.productImage);
        }
        return {
          ...product,
          imageUrl,
        };
      })
    );
    const totalPrice = productsWithImages.reduce((cartSum, product) => {
      return (
        cartSum +
        (product.variants || []).reduce(
          (sum, v) => sum + v.price * (v.count ?? 1),
          0,
        )
      );
    }, 0);
    return {
      items: [
        {
          products: productsWithImages,
          user_id: cart.user_id,
          totalPrice,
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
    let found = false;
    cart.products = cart.products.reduce((acc, item) => {
      if (item.productId !== dto.productId) {
        acc.push(item);
        return acc;
      }
      // Remove only the specified variants
      const originalVariantsLength = item.variants.length;
      item.variants = item.variants.filter(
        (variant) =>
          !dto.variants.some(
            (v) =>
              v.capacity === variant.capacity &&
              v.price === variant.price &&
              (v._id ? v._id === variant._id : true)
          )
      );
      if (item.variants.length < originalVariantsLength) {
        found = true;
      }
      // Only keep the product if it still has variants
      if (item.variants.length > 0) {
        acc.push(item);
      }
      return acc;
    }, []);
    if (!found) {
      this.logger.warn(
        `No matching product/variant found to remove for user_id=${dto.user_id}, productId=${dto.productId}`,
      );
      return { success: false, message: 'Product or variant not found in cart' };
    }
    await cart.save();
    this.logger.log(
      `Removed product/variant from cart for user_id=${dto.user_id}, productId=${dto.productId}`,
    );
    return this.getCart(dto.user_id);
  }

  async updateCartItemCount(dto: UpdateCartItemCountDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) throw new NotFoundException('Cart not found');

    const product = cart.products.find((p) => p.productId === dto.productId);
    if (!product) throw new NotFoundException('Product not found in cart');

    const variantIdx = product.variants.findIndex(
      (v) =>
        v.capacity === dto.capacity &&
        v.price === dto.price &&
        (dto._id ? v._id === dto._id : true),
    );
    if (variantIdx === -1)
      throw new NotFoundException('Variant not found in cart');

    const variant = product.variants[variantIdx];
    const delta = dto.delta ?? 1;
    if (dto.operation === 'increment') {
      variant.count = (variant.count ?? 1) + delta;
    } else if (dto.operation === 'decrement') {
      variant.count = (variant.count ?? 1) - delta;
      if (variant.count <= 0) {
        // Remove variant
        product.variants.splice(variantIdx, 1);
        // Optionally remove product if no variants left
        if (product.variants.length === 0) {
          cart.products = cart.products.filter(
            (p) => p.productId !== dto.productId,
          );
        }
      }
    }
    await cart.save();
    return this.getCart(dto.user_id);
  }
}
