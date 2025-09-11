import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateUserDto } from './dto/updateuser.dto';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserDto } from './dto/user.dto';
import { Messages } from '../../common/messages';
import { AppError } from '../../common/errors';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find(
      {},
      { password: false, refresh_token: false, _id: false },
    );
  }

  async findById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email }).exec();
  }

  async getUserProfileData(id: string): Promise<UserDocument> {
    return this.userModel.findById(id, {
      password: false,
      refresh_token: false,
      _id: false,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { user_id: id },
        {
          first_name: updateUserDto.first_name,
          last_name: updateUserDto.last_name,
          mobile: updateUserDto.mobile,
          accountType: updateUserDto.accountType,
          referralCode: updateUserDto.referralCode,
        },
        {
          new: true,
          projection: { password: false, _id: false, refresh_token: false },
        },
      )
      .exec();
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
