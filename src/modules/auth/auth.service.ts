import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/user.dto';
import { AppError } from '../../common/errors';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from '../token/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

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
    const token = await this.tokenService.generateJwtToken(dto.email);
    const refresh = await this.tokenService.generateJwtRefreshToken(dto.email);
    const user = await this.userService.publicUser(dto.email);
    return { ...user, access_token: token, refresh_token: refresh };
  }
}
