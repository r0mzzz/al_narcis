import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/updateuser.dto';
import { User, UserDocument } from './schema/user.schema';
import { AccountType, CreateUserDto } from './dto/user.dto';
import { Messages } from '../../common/messages';
import { AppError } from '../../common/errors';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Helper to determine gradation
  private getGradation(referralCount: number): string {
    if (referralCount >= 50) return 'platinum';
    if (referralCount >= 35) return 'brilliant';
    if (referralCount >= 20) return 'gold';
    if (referralCount >= 10) return 'silver';
    return 'bronze';
  }

  async create(createUserDto: CreateUserDto): Promise<Record<string, any>> {
    // Generate referralCode: first letter of first_name + first letter of last_name + last 4 digits of mobile
    const referralCode = `${createUserDto.first_name?.[0] || ''}${
      createUserDto.last_name?.[0] || ''
    }${createUserDto.mobile?.slice(-4) || ''}`.toUpperCase();
    const userData: any = {
      ...createUserDto,
      referralCode,
      balance: 0,
      balanceFromReferrals: 0,
      businessCashbackBalance:
        createUserDto.accountType === AccountType.BUSINESS ? 0 : null,
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
      process.env.INVITE_BASE_URL || 'https://yourdomain.com/invite';
    userData.inviteLink = `${inviteBaseUrl}?code=${referralCode}`;
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
    return users.map((user) => {
      const obj = user.toObject();
      return {
        ...obj,
        inviteLink: `${inviteBaseUrl}?code=${obj.referralCode}`,
      };
    });
  }

  async findById(id: string): Promise<Record<string, any>> {
    const user = await this.userModel
      .findOne({ user_id: id })
      .select('-_id -__v -password -refresh_token')
      .exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
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
      inviteLink: `${inviteBaseUrl}?code=${obj.referralCode}`,
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
      .select('-_id -__v -password -refresh_token')
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
      inviteLink: `${inviteBaseUrl}?code=${obj.referralCode}`,
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
      .findById(id)
      .select('-_id -__v -password -refresh_token')
      .exec();
    return user ? user.toObject() : null;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Record<string, any> | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { user_id: id },
        {
          first_name: updateUserDto.first_name,
          last_name: updateUserDto.last_name,
          mobile: updateUserDto.mobile,
        },
        {
          new: true,
        },
      )
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
}
