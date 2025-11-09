import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateUserDto } from './dto/updateuser.dto';
import { CreateUserDto } from './dto/user.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AddAddressDto } from './dto/add-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateGradationDto, UpdateGradationDto } from './dto/gradation.dto';
import { ApplyBusinessCashbackDto } from './dto/apply-business-cashback.dto';
import { SubtractBusinessCashbackDto } from './dto/subtract-business-cashback.dto';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Get()
  findAll(
    @Query('limit') limit = '10',
    @Query('page') page = '1',
    @Query('search') search = '',
  ) {
    const l = Number(limit) || 10;
    const p = Number(page) || 1;
    const s =
      typeof search === 'string' && search.trim() !== ''
        ? search.trim()
        : undefined;
    return this.usersService.findAll(l, p, s);
  }

  @UseGuards(AdminOrUserGuard)
  @Get('profile')
  getUserByToken(@Req() req: Request) {
    const id = req.user['sub'];
    return this.usersService.getUserProfileData(id);
  }

  @Get('gradations')
  async listGradations() {
    return this.usersService.listGradations();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(AdminOrUserGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user['sub'];
    return this.usersService.uploadProfilePicture(userId, file);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete('profile-picture')
  async deleteProfilePicture(@Req() req: Request) {
    const userId = req.user['sub'];
    return this.usersService.deleteProfilePicture(userId);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('gradations')
  async createGradation(@Body() dto: CreateGradationDto) {
    return this.usersService.createGradation(dto);
  }

  @UseGuards(AdminOrUserGuard)
  @Patch('gradations/:id')
  async updateGradation(
    @Param('id') id: string,
    @Body() dto: UpdateGradationDto,
  ) {
    return this.usersService.updateGradation(id, dto);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete('gradations/:id')
  async deleteGradation(@Param('id') id: string) {
    return this.usersService.deleteGradation(id);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('address/add')
  async addAddress(@Req() req: Request, @Body() addAddressDto: AddAddressDto) {
    const userId = req.user['sub'];
    return this.usersService.addAddress(userId, addAddressDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Patch('address/:addressId')
  async updateAddress(
    @Req() req: Request,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const userId = req.user['sub'];
    return this.usersService.updateAddress(userId, addressId, updateAddressDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete('address/:addressId')
  async deleteAddress(
    @Req() req: Request,
    @Param('addressId') addressId: string,
  ) {
    const userId = req.user['sub'];
    return this.usersService.deleteAddress(userId, addressId);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('business-cashback/apply')
  async applyBusinessCashback(
    @Req() req: Request,
    @Body() dto: ApplyBusinessCashbackDto,
  ) {
    const userId = dto.user_id || req.user['sub'];
    return this.usersService.applyBusinessCashback(userId, dto.amount);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('business-cashback/subtract')
  async subtractBusinessCashback(
    @Req() req: Request,
    @Body() dto: SubtractBusinessCashbackDto,
  ) {
    const userId = dto.user_id || req.user['sub'];
    return this.usersService.subtractBusinessCashback(userId, dto.amount);
  }

  @UseGuards(AdminOrUserGuard)
  @Post('business-cashback/subtract-direct')
  async subtractBusinessCashbackDirect(
    @Req() req: Request,
    @Body() dto: SubtractBusinessCashbackDto,
  ) {
    const userId = dto.user_id || req.user['sub'];
    return this.usersService.subtractBusinessCashbackDirect(userId, dto.amount);
  }

  @UseGuards(AdminOrUserGuard)
  @Get('business-cashback/balance/:user_id')
  async getBusinessCashbackBalance(@Param('user_id') user_id: string) {
    return this.usersService.getBusinessCashbackBalance(user_id);
  }

  @UseGuards(AdminOrUserGuard)
  @Patch('disable/:user_id')
  async disableUser(@Param('user_id') user_id: string) {
    return this.usersService.disableUser(user_id);
  }
}
