import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/user.dto';
import { AppError } from '../../common/errors';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async registerUser(dto: CreateUserDto): Promise<CreateUserDto> {
    const userIsExist = await this.userService.findUserByEmail(dto.email);
    console.log('exists', userIsExist);
    if (userIsExist) throw new BadRequestException(AppError.USER_EXISTS);
    return this.userService.createUser(dto);
  }

  async login(dto: LoginUserDto): Promise<LoginUserDto> {
    const existingUser = await this.userService.findUserByEmail(dto.email);
    if (!existingUser) throw new BadRequestException(AppError.USER_NOT_EXISTS);
    const validatePassword = await bcrypt.compare(
      dto.password,
      existingUser.password,
    );
    if (!validatePassword) throw new BadRequestException(AppError.WRONG_DATA);
    return existingUser;
  }
}
