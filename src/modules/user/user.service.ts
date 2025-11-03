import * as crypto from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/updateuser.dto';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserDto } from './dto/user.dto';
import { AccountType } from '../../common/account-type.enum';
import { Messages } from '../../common/messages';
import { AppError } from '../../common/errors';
import { MinioService } from '../../services/minio.service';
import { AddAddressDto } from './dto/add-address.dto';
import { CreateGradationDto, UpdateGradationDto } from './dto/gradation.dto';
import { Gradation, GradationDocument } from './schema/gradation.schema';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62FromBytes(buf: Buffer): string {
  let num = BigInt('0x' + buf.toString('hex'));
  let out = '';
  while (out.length < 8) {
    out = BASE62[Number(num % 62n)] + out;
    num = num / 62n;
  }
  return out;
}

async function generateUniqueReferralCode(
  userModel: Model<UserDocument>,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const rand = crypto.randomBytes(6);
    const code = base62FromBytes(rand).slice(0, 8);
    const exists = await userModel.exists({ referralCode: code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique referral code after retries');
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Gradation.name)
    private gradationModel: Model<GradationDocument>,
    private readonly minioService: MinioService,
  ) {}

  // Determine gradation by consulting DB-configured gradation documents.
  // Returns gradation name (string) — falls back to 'bronze' if none matched.
  private async determineGradation(
    referralCount: number,
  ): Promise<string | null> {
    // Get all active gradations sorted by minReferrals descending
    const grads = await this.gradationModel
      .find({ active: true })
      .sort({ minReferrals: -1 })
      .lean()
      .exec();
    for (const g of grads) {
      if (referralCount >= g.minReferrals) return g.name;
    }
    // If no gradation matches the referral count, return null to indicate no level reached
    return null;
  }

  // Returns active gradation discount for a user if within duration; otherwise null
  // Only applicable for BUSINESS account users and when subtotal (if provided)
  // is >= DEFAULT_MIN_DISCOUNT_AMOUNT (200 AZN).
  async getActiveGradationDiscount(
    user_id: string,
    subtotal?: number,
  ): Promise<{ discount: number; expiresAt: Date | null } | null> {
    // Load user (plain object)
    const user = await this.userModel.findOne({ user_id }).lean();
    if (!user) return null;
    // Enforce BUSINESS account type
    if (user.accountType !== AccountType.BUSINESS) return null;

    // Re-evaluate current gradation from referralCount and update user record if changed.
    // determineGradation returns string|null
    const currentGrad = await this.determineGradation(user.referralCount || 0);
    let gradName: string | null;
    if (currentGrad !== user.gradation) {
      // Persist change: set gradation to currentGrad and update gradationReachedAt when reaching a level
      const update: any = { gradation: currentGrad };
      if (currentGrad) {
        update.gradationReachedAt = new Date();
      } else {
        update.gradationReachedAt = null;
      }
      try {
        await this.userModel.findOneAndUpdate({ user_id }, update).exec();
      } catch (e) {
        // ignore update errors and continue with the previously loaded user
      }
      gradName = currentGrad;
    } else {
      gradName = user.gradation as string | null;
    }
    // If user currently does not belong to any gradation, no discount
    if (!gradName) return null;
    const grad = await this.gradationModel
      .findOne({ name: gradName, active: true })
      .lean()
      .exec();
    if (!grad || typeof grad.discountPercent !== 'number') return null;
    // If gradation defines minAmount and subtotal provided, enforce it
    if (
      typeof subtotal === 'number' &&
      typeof grad.minAmount === 'number' &&
      subtotal < grad.minAmount
    ) {
      return null;
    }
    // If durationDays not provided or <=0 treat as permanent
    // Use the up-to-date reached timestamp. If we updated the user above, reload it; otherwise use existing.
    const userToCheck = await this.userModel.findOne({ user_id }).lean();
    if (!userToCheck) return null;
    if (
      !userToCheck.gradationReachedAt ||
      !grad.durationDays ||
      grad.durationDays <= 0
    ) {
      return { discount: grad.discountPercent, expiresAt: null };
    }
    const reached = new Date(userToCheck.gradationReachedAt).getTime();
    const now = Date.now();
    const ms = grad.durationDays * 24 * 60 * 60 * 1000;
    if (now - reached <= ms) {
      return {
        discount: grad.discountPercent,
        expiresAt: new Date(reached + ms),
      };
    }
    return null;
  }

  async create(createUserDto: CreateUserDto): Promise<Record<string, any>> {
    // Remove addresses from user creation
    const restDto = { ...(createUserDto as any) };
    delete restDto.addresses;
    // Generate a secure, unique referralCode
    const referralCode = await generateUniqueReferralCode(this.userModel);
    const userData: any = {
      ...restDto,
      referralCode,
      balance: 0,
      balanceFromReferrals: 0,
      businessCashbackBalance:
        restDto.accountType === AccountType.BUSINESS ? 0 : null,
      referralCount: 0,
      // No gradation by default until user reaches configured levels
      gradation: null,
    };

    // Only handle referral logic if referralCode is a non-empty string
    let invitedBy: string | null = null;
    let referrer: UserDocument | null = null;
    if (
      typeof createUserDto.referralCode === 'string' &&
      createUserDto.referralCode.trim() !== ''
    ) {
      referrer = await this.userModel.findOne({
        referralCode: createUserDto.referralCode,
      });
      if (referrer) {
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        const newGrad = await this.determineGradation(referrer.referralCount);
        if (newGrad !== referrer.gradation) {
          referrer.gradation = newGrad;
          referrer.gradationReachedAt = new Date();
        }
        invitedBy = referrer.user_id;
      }
    }

    // Generate invite link based on referralCode
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL ||
      'https://yourdomain.com/invite?inviteCode=';
    userData.inviteLink = `${inviteBaseUrl}${referralCode}`;
    userData.invitedBy = invitedBy;

    const createdUser = new this.userModel(userData);
    const savedUser = await createdUser.save();
    const obj = savedUser.toObject();
    // If referrer exists, push this user to their invites array and save
    if (referrer) {
      referrer.invites = referrer.invites || [];
      referrer.invites.push({
        user_id: obj.user_id,
        first_name: obj.first_name,
        last_name: obj.last_name,
        email: obj.email,
        mobile: obj.mobile,
        accountType: obj.accountType,
        referralCode: obj.referralCode,
        gradation: obj.gradation,
        inviteLink: obj.inviteLink,
      });
      await referrer.save();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...rest } = obj;
    return { ...rest, invitedBy };
  }

  async findAll(
    limit = 10,
    page = 1,
    search?: string,
  ): Promise<{
    total: number;
    totalPages: number;
    currentPage: number;
    users: Record<string, any>[];
  }> {
    // Build filter: if search provided, match email or mobile (case-insensitive, partial)
    const filter: any = {};
    if (search && typeof search === 'string' && search.trim() !== '') {
      const s = search.trim();
      const regex = { $regex: s, $options: 'i' };
      filter.$or = [{ email: regex }, { mobile: regex }];
    }

    const users = await this.userModel
      .find(filter, { password: false, refresh_token: false })
      .select('-_id -__v')
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.userModel.countDocuments(filter).exec();
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite';
    const userWithDetails = await Promise.all(
      users.map(async (user) => {
        const obj = user.toObject();
        let presignedImage = '';
        if (obj.imagePath) {
          presignedImage = await this.minioService.getPresignedUrl(
            obj.imagePath,
          );
        }
        return {
          ...obj,
          imagePath: presignedImage || undefined,
          inviteLink: `${inviteBaseUrl}${obj.referralCode}`,
        };
      }),
    );
    return {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      users: userWithDetails,
    };
  }

  async findById(id: string): Promise<Record<string, any>> {
    const user = await this.userModel
      .findOne({ user_id: id })
      .select('-_id -__v -password -refresh_token')
      .exec();
    if (!user) {
      throw new BadRequestException('İstifadəçi tapılmadı');
    }
    const obj = user.toObject();
    let presignedImage = '';
    if (obj.imagePath) {
      presignedImage = await this.minioService.getPresignedUrl(obj.imagePath);
    }
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite';
    const invites = await this.userModel
      .find({ invitedBy: obj.user_id })
      .select('first_name last_name email')
      .exec();
    const maskEmail = (email: string) => {
      const [name, domain] = email.split('@');
      if (!name || !domain) return email;
      return name[0] + '***' + name.slice(-1) + '@' + domain;
    };
    return {
      ...obj,
      imagePath: presignedImage || undefined,
      inviteLink: `${inviteBaseUrl}${obj.referralCode}`,
      invites: invites.map((inv) => ({
        first_name: inv.first_name,
        last_name: inv.last_name,
        email: maskEmail(inv.email),
      })),
    };
  }

  async findByEmail(email: string): Promise<Record<string, any> | null> {
    const user = await this.userModel
      .findOne({ email })
      .select('-__v -password -refresh_token')
      .exec();
    if (!user) return null;
    const obj = user.toObject();
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite';
    // Find all users invited by this user
    const invites = await this.userModel
      .find({ invitedBy: obj.user_id })
      .select('first_name last_name email')
      .exec();
    // Mask email helper
    const maskEmail = (email: string) => {
      const [name, domain] = email.split('@');
      if (!name || !domain) return email;
      return name[0] + '***' + name.slice(-1) + '@' + domain;
    };
    return {
      ...obj,
      inviteLink: `${inviteBaseUrl}${obj.referralCode}`,
      invites: invites.map((inv) => ({
        first_name: inv.first_name,
        last_name: inv.last_name,
        email: maskEmail(inv.email),
      })),
    };
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async getUserProfileData(id: string): Promise<Record<string, any>> {
    const user = await this.userModel
      .findOne({ user_id: id })
      .select('-_id -__v -password -refresh_token')
      .exec();
    if (!user) return null;
    const obj = user.toObject();
    let presignedImage = '';
    if (obj.imagePath) {
      presignedImage = await this.minioService.getPresignedUrl(obj.imagePath);
    }
    return {
      ...obj,
      imagePath: presignedImage || undefined,
    };
  }

  private isValidMinioObjectPath(path: string): boolean {
    return (
      typeof path === 'string' && !path.includes('://') && !path.includes('?')
    );
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<Record<string, any>> {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) throw new BadRequestException('İstifadəçi tapılmadı');
    // Remove previous image if exists and is a valid Minio object path
    if (user.imagePath && this.isValidMinioObjectPath(user.imagePath)) {
      try {
        await this.minioService.removeObject(user.imagePath);
      } catch (e) {
        // Log but don't fail if image doesn't exist
      }
    }
    // Upload new image to profile/user-profile/{user_id}/photo.{ext}
    const fileExtension = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
    );
    const minioPath = `profile/user-profile/${userId}/photo${fileExtension}`;
    await this.minioService.uploadToPath(file, minioPath);
    user.imagePath = minioPath;
    // Filter out invalid addresses before saving to avoid validation errors
    if (Array.isArray(user.addresses)) {
      user.addresses = user.addresses.filter(
        (a) => a && typeof a.address === 'string' && a.address.trim() !== '',
      );
    }
    await user.save();
    return user.toObject();
  }

  async deleteProfilePicture(userId: string): Promise<Record<string, any>> {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) throw new BadRequestException('İstifadəçi tapılmadı');
    if (user.imagePath && this.isValidMinioObjectPath(user.imagePath)) {
      try {
        await this.minioService.removeObject(user.imagePath);
      } catch (e) {
        // Log but don't fail if image doesn't exist
      }
      user.imagePath = undefined;
      await user.save();
    }
    return user.toObject();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Record<string, any> | null> {
    // Remove addresses from update
    const restDto = { ...(updateUserDto as any) };
    delete restDto.addresses;
    // Build update object dynamically to allow updating any field except addresses
    const updateObj: any = { ...restDto };
    // Always use user_id for lookup
    const user = await this.userModel
      .findOneAndUpdate({ user_id: id }, updateObj, {
        new: true,
      })
      .select('-_id -__v -password -refresh_token')
      .exec();
    return user ? user.toObject() : null;
  }

  async updateByUserId(
    user_id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Record<string, any> | null> {
    const updateObj: any = {};
    for (const key in updateUserDto) {
      if (updateUserDto[key] !== undefined) {
        updateObj[key] = updateUserDto[key];
      }
    }
    const user = await this.userModel
      .findOneAndUpdate({ user_id }, updateObj, {
        new: true,
      })
      .select('-_id -__v -password -refresh_token')
      .exec();
    return user ? user.toObject() : null;
  }

  async userExists(id: string) {
    return this.userModel.findOne({ user_id: id }).exec();
  }

  async deleteUser(id: string): Promise<any> {
    if (!(await this.userExists(id)))
      throw new BadRequestException(AppError.ID_DOESNT_EXISTS);
    const user = await this.userModel.findOne({ user_id: id });
    await this.userModel.findOneAndDelete({ user_id: id }, {}).exec();
    return { message: Messages.DELETED(user.email) };
  }

  async findByUserId(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ user_id: userId });
  }

  /**
   * Calculate how much of the amount can be covered by businessCashbackBalance, but do NOT update the balance.
   * Returns the amount left to pay and whether it is free (fully covered).
   */
  async applyBusinessCashback(
    user_id: string,
    amount: number,
  ): Promise<{ totalAmount: number; isFree: boolean }> {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 0) {
      throw new BadRequestException('Invalid amount');
    }
    const user = await this.userModel.findOne({ user_id });
    if (!user) throw new BadRequestException('İstifadəçi tapılmadı');

    // Only BUSINESS accounts have businessCashbackBalance
    if (user.accountType !== AccountType.BUSINESS) {
      return { totalAmount: amount, isFree: false };
    }

    const bal = Number(user.businessCashbackBalance ?? 0);
    if (bal <= 0) {
      return { totalAmount: amount, isFree: false };
    }

    if (bal >= amount) {
      return { totalAmount: 0, isFree: true };
    }

    // bal < amount
    const remaining = Number((amount - bal).toFixed(2));
    return { totalAmount: remaining, isFree: remaining === 0 };
  }

  /**
   * Subtract the given amount from user's businessCashbackBalance (if possible).
   * If balance >= amount, subtract amount. If balance < amount, set balance to 0.
   * Returns the updated balance.
   */
  async subtractBusinessCashback(
    user_id: string,
    amount: number,
  ): Promise<{ newBalance: number }> {
    Logger.log(
      `[subtractBusinessCashback] Called with user_id=${user_id}, amount=${amount}`,
    );
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 0) {
      Logger.error(`[subtractBusinessCashback] Invalid amount: ${amount}`);
      throw new BadRequestException('Invalid amount');
    }
    const user = await this.userModel.findOne({ user_id });
    if (!user) {
      Logger.error(
        `[subtractBusinessCashback] User not found for user_id: ${user_id}`,
      );
      throw new BadRequestException('İstifadəçi tapılmadı');
    }
    if (user.accountType !== AccountType.BUSINESS) {
      Logger.error(
        `[subtractBusinessCashback] Not a BUSINESS account: user_id=${user_id}`,
      );
      throw new BadRequestException(
        'Yalnız biznes istifadəçilər üçün keçərlidir',
      );
    }
    const bal = Number(user.businessCashbackBalance ?? 0);
    Logger.log(
      `[subtractBusinessCashback] Before: user_id=${user_id}, balance=${bal}, amount=${amount}`,
    );
    if (bal <= 0) {
      user.businessCashbackBalance = 0;
      await user.save();
      Logger.log(
        `[subtractBusinessCashback] After: user_id=${user_id}, balance=0`,
      );
      return { newBalance: 0 };
    }
    if (bal >= amount) {
      user.businessCashbackBalance = bal - amount;
      await user.save();
      Logger.log(
        `[subtractBusinessCashback] After: user_id=${user_id}, balance=${user.businessCashbackBalance}`,
      );
      return { newBalance: user.businessCashbackBalance };
    }
    // bal < amount
    user.businessCashbackBalance = 0;
    await user.save();
    Logger.log(
      `[subtractBusinessCashback] After: user_id=${user_id}, balance=0`,
    );
    return { newBalance: 0 };
  }

  /**
   * Directly subtracts amount from businessCashbackBalance using updateOne for debugging.
   */
  async subtractBusinessCashbackDirect(
    user_id: string,
    amount: number,
  ): Promise<{ newBalance: number; updateResult: any }> {
    Logger.log(
      `[subtractBusinessCashbackDirect] Called with user_id=${user_id}, amount=${amount}`,
    );
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 0) {
      Logger.error(`[subtractBusinessCashbackDirect] Invalid amount: ${amount}`);
      throw new BadRequestException('Invalid amount');
    }
    const user = await this.userModel.findOne({ user_id });
    if (!user) {
      Logger.error(
        `[subtractBusinessCashbackDirect] User not found for user_id: ${user_id}`,
      );
      throw new BadRequestException('İstifadəçi tapılmadı');
    }
    if (user.accountType !== AccountType.BUSINESS) {
      Logger.error(
        `[subtractBusinessCashbackDirect] Not a BUSINESS account: user_id=${user_id}`,
      );
      throw new BadRequestException(
        'Yalnız biznes istifadəçilər üçün keçərlidir',
      );
    }
    // Only subtract up to the current balance
    const bal = Number(user.businessCashbackBalance ?? 0);
    const subtractAmount = Math.min(bal, amount);
    const updateResult = await this.userModel.updateOne(
      { user_id },
      { $inc: { businessCashbackBalance: -subtractAmount } }
    );
    Logger.log(`[subtractBusinessCashbackDirect] updateOne result: ${JSON.stringify(updateResult)}`);
    // Fetch the user again to get the new balance
    const updatedUser = await this.userModel.findOne({ user_id });
    Logger.log(`[subtractBusinessCashbackDirect] After: user_id=${user_id}, balance=${updatedUser.businessCashbackBalance}`);
    return { newBalance: Number(updatedUser.businessCashbackBalance ?? 0), updateResult };
  }

  async getBusinessCashbackBalance(
    user_id: string,
  ): Promise<{ balance: number }> {
    const user = await this.userModel.findOne({ user_id });
    if (!user) {
      Logger.error(
        `[getBusinessCashbackBalance] User not found for user_id: ${user_id}`,
      );
      throw new BadRequestException('İstifadəçi tapılmadı');
    }
    return { balance: Number(user.businessCashbackBalance ?? 0) };
  }

  async addAddress(
    userId: string,
    addAddressDto: AddAddressDto,
  ): Promise<Record<string, any>> {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) {
      throw new BadRequestException('İstifadəçi tapılmadı');
    }
    if (!Array.isArray(user.addresses)) {
      user.addresses = [];
    }
    user.addresses.push({
      address: addAddressDto.address,
      isFavorite: addAddressDto.isFavorite,
    });
    await user.save();
    return user.toObject();
  }

  async updateAddress(
    userId: string,
    addressId: string,
    updateAddressDto: Partial<{ address: string; isFavorite: boolean }>,
  ) {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) throw new BadRequestException('User not found');
    const address = user.addresses.find(
      (a: any) => a._id?.toString() === addressId,
    );
    if (!address) throw new BadRequestException('Address not found');
    if (updateAddressDto.address !== undefined) {
      address.address = updateAddressDto.address;
    }
    if (updateAddressDto.isFavorite !== undefined) {
      address.isFavorite = updateAddressDto.isFavorite;
    }
    // Remove invalid addresses before saving
    user.addresses = user.addresses.filter(
      (a: any) => a && typeof a.address === 'string' && a.address.trim() !== '',
    );
    await user.save();
    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) throw new BadRequestException('User not found');
    const addressIndex = user.addresses.findIndex(
      (a: any) => a._id?.toString() === addressId,
    );
    if (addressIndex === -1) throw new BadRequestException('Address not found');
    user.addresses.splice(addressIndex, 1);
    await user.save();
    return { success: true };
  }

  // Gradation management: create / list / update / delete
  async createGradation(dto: CreateGradationDto) {
    const created = new this.gradationModel({
      name: dto.name,
      minReferrals: dto.minReferrals,
      discountPercent: dto.discountPercent,
      durationDays:
        typeof dto.durationDays === 'number' ? dto.durationDays : null,
      note: typeof dto.note === 'string' ? dto.note : undefined,
      minAmount: typeof dto.minAmount === 'number' ? dto.minAmount : 0,
      active: dto.active ?? true,
    });
    await created.save();
    return created.toObject();
  }

  async listGradations() {
    return this.gradationModel.find().lean().exec();
  }

  async updateGradation(id: string, dto: UpdateGradationDto) {
    const grad = await this.gradationModel.findById(id).exec();
    if (!grad) throw new BadRequestException('Gradation not found');
    if (dto.minReferrals !== undefined) grad.minReferrals = dto.minReferrals;
    if (dto.discountPercent !== undefined)
      grad.discountPercent = dto.discountPercent;
    if (dto.durationDays !== undefined)
      grad.durationDays = dto.durationDays as any;
    if (dto.minAmount !== undefined) grad.minAmount = dto.minAmount as any;
    if (dto.note !== undefined) grad.note = dto.note;
    if (dto.active !== undefined) grad.active = dto.active;
    await grad.save();
    return grad.toObject();
  }

  async deleteGradation(id: string) {
    const res = await this.gradationModel.findByIdAndDelete(id).exec();
    if (!res) throw new BadRequestException('Gradation not found');
    return { success: true };
  }

  async disableUser(user_id: string): Promise<{ success: boolean; user?: any }> {
    const user = await this.userModel.findOne({ user_id });
    if (!user) {
      return { success: false };
    }
    user.data_status = 0;
    await user.save();
    return { success: true, user };
  }
}
