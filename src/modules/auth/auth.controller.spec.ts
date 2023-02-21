import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUserService = {
    signIn: jest.fn((dto: LoginUserDto) => {
      return {
        ...dto,
      };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
      controllers: [AuthController],
    })
      .overrideProvider(AuthService)
      .useValue(mockUserService)
      .compile();
    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('signin', () => {
    it('should sign in', () => {
      const loginUserDto: LoginUserDto = {
        email: 'test@bk.ru',
        password: 'testpassword',
      };
      expect(controller.signin(loginUserDto)).toEqual(loginUserDto);
      expect(loginUserDto && typeof loginUserDto === 'object').toBe(true);
      expect(mockUserService.signIn).toHaveBeenCalledWith(loginUserDto);
    });
  });
});
