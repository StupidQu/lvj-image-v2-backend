import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { VerificationService } from './verification.service';
import { EmailService } from 'src/email/email.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { sign: jest.fn() };
  const usersService = {
    getByName: jest.fn(),
    getByEmail: jest.fn(),
    register: jest.fn(),
    addIp: jest.fn(),
    verify: jest.fn(),
  };
  const verificationService = {
    validateCode: jest.fn(),
    markAsUsed: jest.fn(),
    checkSendLimit: jest.fn(),
    createVerification: jest.fn(),
  };
  const emailService = { sendVerificationCode: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: VerificationService, useValue: verificationService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('temporarily rejects new registration while preserving registration logic', async () => {
    const result = await controller.register(
      {
        name: 'new_user',
        password: 'password123',
        email: 'new@example.com',
        code: '123456',
      },
      '127.0.0.1',
    );

    expect(result).toEqual({ success: false, message: '注册暂时关闭' });
    expect(verificationService.validateCode).not.toHaveBeenCalled();
    expect(usersService.register).not.toHaveBeenCalled();
  });

  it('does not send registration codes for new users while registration is paused', async () => {
    usersService.getByName.mockResolvedValue(null);
    usersService.getByEmail.mockResolvedValue(null);

    const result = await controller.sendCode(
      { username: 'new_user', email: 'new@example.com' },
      '127.0.0.1',
    );

    expect(result).toEqual({ success: false, message: '注册暂时关闭' });
    expect(verificationService.checkSendLimit).not.toHaveBeenCalled();
    expect(emailService.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('keeps login available for existing users', async () => {
    usersService.getByEmail.mockResolvedValue({ name: 'existing_user' });
    usersService.verify.mockResolvedValue(true);
    usersService.addIp.mockResolvedValue(undefined);
    authService.sign.mockResolvedValue({ access_token: 'token' });

    const result = await controller.login(
      { email: 'existing@example.com', password: 'password123' },
      '127.0.0.1',
    );

    expect(result).toEqual({ success: true, accessToken: 'token' });
  });
});
