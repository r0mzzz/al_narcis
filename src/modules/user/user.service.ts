import * as crypto from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
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
    private readonly minioService: MinioService,
  ) {}

  // Helper to determine gradation
  private getGradation(referralCount: number): string {
    if (referralCount >= 50) return 'platinum';
    if (referralCount >= 35) return 'brilliant';
    if (referralCount >= 20) return 'gold';
    if (referralCount >= 10) return 'silver';
    return 'bronze';
  }

  async create(createUserDto: CreateUserDto): Promise<Record<string, any>> {
    // Remove addresses from user creation
    const { addresses, ...restDto } = createUserDto as any;
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
      gradation: 'bronze',
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
        referrer.gradation = this.getGradation(referrer.referralCount);
        invitedBy = referrer.user_id;
      }
    }

    // Generate invite link based on referralCode
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite?inviteCode=';
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

  async findAll(): Promise<Record<string, any>[]> {
    const users = await this.userModel
      .find({}, { password: false, refresh_token: false })
      .select('-_id -__v')
      .exec();
    const inviteBaseUrl =
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite';
    return Promise.all(
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
    const { addresses, ...restDto } = updateUserDto as any;
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
}
