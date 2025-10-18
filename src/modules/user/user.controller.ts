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

@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(AccessTokenGuard)
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user['sub'];
    return this.usersService.uploadProfilePicture(userId, file);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('profile-picture')
  async deleteProfilePicture(@Req() req: Request) {
    const userId = req.user['sub'];
    return this.usersService.deleteProfilePicture(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Post('gradations')
  async createGradation(@Body() dto: CreateGradationDto) {
    return this.usersService.createGradation(dto);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('gradations/:id')
  async updateGradation(
    @Param('id') id: string,
    @Body() dto: UpdateGradationDto,
  ) {
    return this.usersService.updateGradation(id, dto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('gradations/:id')
  async deleteGradation(@Param('id') id: string) {
    return this.usersService.deleteGradation(id);
  }

  @UseGuards(AccessTokenGuard)
  @Post('address/add')
  async addAddress(@Req() req: Request, @Body() addAddressDto: AddAddressDto) {
    const userId = req.user['sub'];
    return this.usersService.addAddress(userId, addAddressDto);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('address/:addressId')
  async updateAddress(
    @Req() req: Request,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const userId = req.user['sub'];
    return this.usersService.updateAddress(userId, addressId, updateAddressDto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('address/:addressId')
  async deleteAddress(
    @Req() req: Request,
    @Param('addressId') addressId: string,
  ) {
    const userId = req.user['sub'];
    return this.usersService.deleteAddress(userId, addressId);
  }
}
