import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './schema/admin.schema';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: AdminRegisterDto) {
    const exists = await this.adminModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Admin already exists');
    const hash = await bcrypt.hash(dto.password, 10);
    const admin = new this.adminModel({ email: dto.email, password: hash });
    await admin.save();
    return { email: admin.email };
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.adminModel.findOne({ email: dto.email });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const payload = { email: admin.email, sub: admin._id, role: 'admin' };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }
}
