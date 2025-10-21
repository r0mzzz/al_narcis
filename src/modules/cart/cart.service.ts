import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schema/cart.schema';
import {
  Discount,
  DiscountDocument,
  DiscountType,
} from './schema/discount.schema';
import { AddToCartDto, RemoveFromCartDto } from './dto/cart-ops.dto';
import { UpdateCartItemCountDto } from './dto/update-cart-item-count.dto';
import { MinioService } from '../../services/minio.service';
import { ProductService } from '../product/product.service';
import { UsersService } from '../user/user.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { AccountType } from '../../common/account-type.enum';

@Injectable()
export class CartService {
  private static readonly DEFAULT_MIN_DISCOUNT_AMOUNT = 200; // AZN
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Discount.name) private discountModel: Model<DiscountDocument>,
    private readonly minioService: MinioService,
    private readonly productService: ProductService,
    private readonly usersService: UsersService,
  ) {}

  async addToCart(dto: AddToCartDto) {
    if (!dto.product) {
      throw new BadRequestException('Missing required field: product');
    }
    const { productId, variants } = dto.product;
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      throw new BadRequestException('Missing variants');
    }
    // Normalize incoming productImage to object path (not full presigned URL)
    const normalizeImagePath = (image?: string): string | undefined => {
      if (!image) return undefined;
      try {
        const url = new URL(image);
        // Prefer path starting from '/products/...'
        const idx = url.pathname.indexOf('/products/');
        if (idx >= 0) {
          return url.pathname.slice(idx + 1); // remove leading '/'
        }
        // If not found, strip leading slash
        if (url.pathname.startsWith('/')) {
          return url.pathname.slice(1);
        }
        return url.pathname;
      } catch (e) {
        // Not a full URL — assume already an object path
        // If contains query string, strip it
        const qIdx = image.indexOf('?');
        const raw = qIdx >= 0 ? image.slice(0, qIdx) : image;
        // If it contains '/products/' return from there
        const pIdx = raw.indexOf('/products/');
        if (pIdx >= 0) {
          return raw.slice(pIdx + 1);
        }
        return raw;
      }
    };

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
        if (variantIdx > -1) {
          cartProduct.variants[variantIdx].count =
            (cartProduct.variants[variantIdx].count ?? 0) + increment;
        } else {
          cartProduct.variants.push({ ...incomingVariant, count: increment });
        }
      }
    } else {
      const productToAdd = {
        ...dto.product,
        user_id: dto.user_id,
        productImage: normalizeImagePath(dto.product.productImage) ?? undefined,
      };
      cart.products.push(productToAdd);
    }
    await cart.save();
    // Reload cart to ensure latest data is returned
    return this.getCart(dto.user_id);
  }

  async getCart(user_id: string) {
    const cart = await this.cartModel.findOne({ user_id }).lean();
    if (!cart) return { items: [] };
    const products = cart.products || [];
    // Use cached presigned URLs for product images
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        let presigned = null;
        // product.productImage should be stored as object path like 'products/xxx.png'
        if (product.productImage) {
          // Generate fresh presigned URL for each cart response and place it into productImage
          try {
            presigned = await this.minioService.getPresignedUrl(
              product.productImage,
            );
          } catch (e) {
            presigned = null;
          }
        }
        return {
          ...product,
          // return presigned URL in productImage field as requested
          productImage: presigned,
        };
      }),
    );
    // Calculate subtotal by looking up authoritative product prices where possible
    let subtotal = 0;
    const detailedProducts = await Promise.all(
      productsWithImages.map(async (cartProduct) => {
        // Try to load product from products collection by productId
        const productInfo = await this.productService.findByProductId(
          cartProduct.productId,
        );
        const variants = await Promise.all(
          (cartProduct.variants || []).map(async (v) => {
            // Determine price: prefer authoritative product data if available and variant match found
            let unitPrice = v.price;
            if (productInfo && Array.isArray(productInfo.variants)) {
              // Match variant by capacity (authoritative source of truth for variant prices)
              const matched = productInfo.variants.find(
                (pv: any) => pv.capacity === v.capacity,
              );
              if (matched && typeof matched.price === 'number') {
                unitPrice = matched.price;
              }
            }
            const count = v.count ?? 1;
            const lineTotal = unitPrice * count;
            subtotal += lineTotal;
            return { ...v, unitPrice, lineTotal };
          }),
        );
        return { ...cartProduct, variants };
      }),
    );

    // Get gradation-based discount only for BUSINESS users and when subtotal
    // meets the minimum threshold for discounts (DEFAULT_MIN_DISCOUNT_AMOUNT)
    let gradPercent = 0;
    try {
      const user = await this.usersService.findByUserId(cart.user_id);
      if (
        user &&
        user.accountType === AccountType.BUSINESS &&
        subtotal >= CartService.DEFAULT_MIN_DISCOUNT_AMOUNT
      ) {
        const gradationDiscount =
          await this.usersService.getActiveGradationDiscount(
            cart.user_id,
            subtotal,
          );
        gradPercent = gradationDiscount?.discount ?? 0;
      }
    } catch (e) {
      // ignore and treat as no gradation discount
      gradPercent = 0;
    }
    // Get model-based discount (cart/user/global) — these require subtotal thresholds
    const modelApplicable = await this.getApplicableDiscount(
      cart.user_id,
      cart.discount,
      subtotal,
    );
    const modelPercent = modelApplicable?.discount ?? 0;
    // Combine discounts (gradation + model). Cap at 100%.
    let discountPercent = +(gradPercent + modelPercent);
    if (discountPercent > 100) discountPercent = 100;
    const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2);
    const total = +(subtotal - discountAmount).toFixed(2);

    return {
      items: [
        {
          products: detailedProducts,
          user_id: cart.user_id,
          subTotal: +subtotal.toFixed(2),
          discount: discountPercent,
          discountAmount,
          total,
        },
      ],
    };
  }

  async deleteCart(user_id: string) {
    await this.cartModel.deleteOne({ user_id });
    return { success: true };
  }

  async removeItemFromCart(dto: RemoveFromCartDto) {
    const cart = await this.cartModel.findOne({ user_id: dto.user_id });
    if (!cart) {
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
              (v._id ? v._id === variant._id : true),
          ),
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
      return {
        success: false,
        message: 'Product or variant not found in cart',
      };
    }
    await cart.save();
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

  async setDiscount(user_id: string, discount: number) {
    if (typeof discount !== 'number' || discount < 0 || discount > 100) {
      throw new BadRequestException('Invalid discount value');
    }
    const cart = await this.cartModel.findOne({ user_id });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    cart.discount = discount;
    await cart.save();
    return this.getCart(user_id);
  }

  // Resolve applicable discount for a given user_id. If cartDiscount provided (number), it has highest priority.
  // Discounts are only applied when subtotal meets minimum threshold (default 200 AZN) or discount.minAmount.
  private async getApplicableDiscount(
    user_id: string,
    cartDiscount?: number | null,
    subtotal = 0,
  ) {
    // If subtotal is less than global threshold, no discounts apply
    if (subtotal < CartService.DEFAULT_MIN_DISCOUNT_AMOUNT) return null;
    // Cart-level and user/global discounts require the default threshold, but gradation discounts
    // should be evaluated regardless of subtotal. Do not early-return here.
    // Cart-level discount and user-specific/global discounts will be checked only when subtotal >= DEFAULT.
    // Cart-level discount (highest priority)
    if (typeof cartDiscount === 'number') {
      return { source: 'cart', discount: cartDiscount };
    }
    try {
      // Look for active user-specific discount that meets its minAmount (if any)
      const userDiscount = await this.discountModel
        .findOne({ type: DiscountType.USER, user_id, active: true })
        .lean()
        .exec();
      if (
        userDiscount &&
        typeof userDiscount.discount === 'number' &&
        (typeof userDiscount.minAmount !== 'number' ||
          subtotal >= userDiscount.minAmount)
      ) {
        return { source: 'user', discount: userDiscount.discount };
      }

      // Otherwise look for active global discounts that meet minAmount and pick the highest percentage
      const globalDiscounts = await this.discountModel
        .find({ type: DiscountType.GLOBAL, active: true })
        .lean()
        .exec();
      if (Array.isArray(globalDiscounts) && globalDiscounts.length > 0) {
        const eligible = globalDiscounts.filter((d) => {
          return (
            typeof d.discount === 'number' &&
            (typeof d.minAmount !== 'number' || subtotal >= d.minAmount)
          );
        });
        if (eligible.length > 0) {
          const max = eligible.reduce(
            (acc, d) => (d.discount > acc ? d.discount : acc),
            0,
          );
          if (max > 0) return { source: 'global', discount: max };
        }
      }
    } catch (err) {
      // ignore errors and fallback to no discount
    }
    return null;
  }

  // Admin API: create a discount entry (global or user)
  async createDiscount(dto: CreateDiscountDto) {
    const created = new this.discountModel({
      type: dto.type,
      user_id: dto.user_id,
      discount: dto.discount,
      minAmount:
        typeof dto.minAmount === 'number'
          ? dto.minAmount
          : CartService.DEFAULT_MIN_DISCOUNT_AMOUNT,
      active: dto.active ?? true,
    });
    await created.save();
    return created.toObject();
  }

  async listDiscounts() {
    return await this.discountModel.find().lean().exec();
  }

  async deleteDiscount(id: string) {
    const res = await this.discountModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Discount not found');
    return { success: true };
  }

  async updateDiscount(id: string, dto: Partial<CreateDiscountDto>) {
    const discount = await this.discountModel.findById(id).exec();
    if (!discount) throw new NotFoundException('Discount not found');
    if (dto.type !== undefined) discount.type = dto.type as any;
    if (dto.user_id !== undefined) discount.user_id = dto.user_id;
    if (typeof dto.discount === 'number') discount.discount = dto.discount;
    if (typeof dto.minAmount === 'number') discount.minAmount = dto.minAmount;
    if (dto.active !== undefined) discount.active = dto.active;
    await discount.save();
    return discount.toObject();
  }
}
