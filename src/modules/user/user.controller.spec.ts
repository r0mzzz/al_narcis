import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/updateuser.dto';

describe('UserController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserService = {
    create: jest.fn((dto) => {
      return {
        ...dto,
      };
    }),
    update: jest.fn().mockImplementation((id, dto) => ({
      id,
      ...dto,
    })),
    findAll: jest.fn(() => {
      return [];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
      controllers: [UsersController],
    })
      .overrideProvider(UsersService)
      .useValue(mockUserService)
      .compile();
    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', () => {
      const userCreateDto: CreateUserDto = {
        first_name: 'Test',
        last_name: 'Test',
        email: 'test@bk.ru',
        username: 'tesr',
      };
      expect(controller.create(userCreateDto)).toEqual(userCreateDto);
      expect(mockUserService.create).toHaveBeenCalledWith(userCreateDto);
    });
  });

  describe('updateUser', () => {
    it('should update a user', () => {
      const userUpdateDto: UpdateUserDto = {
        first_name: 'Test',
        last_name: 'Test',
        username: 'Test',
      };
      expect(controller.update('1', userUpdateDto)).toEqual({
        first_name: 'Test',
        last_name: 'Test',
        username: 'Test',
        id: '1',
      });
      expect(mockUserService.update).toHaveBeenCalled();
    });
  });

  describe('findAllUsers', () => {
    it('should return all users', () => {
      expect(controller.findAll()).toEqual({});
      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });
});
