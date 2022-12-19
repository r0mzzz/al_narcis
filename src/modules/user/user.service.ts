import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { CreateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userDocumentModel: Model<UserDocument>,
  ) {}

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async findUserByEmail(email: string) {
    return this.userDocumentModel.findOne({ email });
  }

  async update(id: string, updateUserDto: any): Promise<UserDocument> {
    return this.userDocumentModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async createUser(dto: CreateUserDto): Promise<CreateUserDto> {
    dto.password = await this.hashPassword(dto.password);
    await this.userDocumentModel.create({ ...dto });
    return dto;
  }

  async publicUser(email: string) {
    return this.userDocumentModel.findOne({ email }).select('-password').lean();
  }
}
