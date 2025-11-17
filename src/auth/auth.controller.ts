import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from 'src/users/users.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { RealIp } from 'nestjs-real-ip';
import { SendCodeDto } from './dto/send-code.dto';
import { VerificationService } from './verification.service';
import { EmailService } from 'src/email/email.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
  ) {}

  @Public()
  @Post('send-code')
  async sendCode(@Body() body: SendCodeDto, @RealIp() ip: string) {
    const limitCheck = await this.verificationService.checkSendLimit(
      body.email,
      ip,
    );
    if (!limitCheck.canSend) {
      return { success: false, message: limitCheck.reason };
    }
    const code = await this.verificationService.createVerification(
      body.email,
      ip,
    );
    const sent = await this.emailService.sendVerificationCode(body.email, code);
    if (!sent) {
      return { success: false, message: '邮件发送失败，请稍后重试' };
    }

    return { success: true, message: '验证码已发送' };
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto, @RealIp() ip: string) {
    const validation = await this.verificationService.validateCode(
      body.email,
      body.code,
    );
    if (!validation.valid) {
      return { success: false, message: validation.reason };
    }
    const user = await this.usersService.register(
      body.name,
      body.password,
      body.email,
    );
    if (!user) return { success: false, message: '用户名或邮箱已存在' };
    await this.verificationService.markAsUsed(body.email, body.code);

    await this.usersService.addIp(body.name, ip);
    const token = await this.authService.sign(body.name);
    return { success: true, accessToken: token.access_token };
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto, @RealIp() ip: string) {
    if (!body.email && !body.name) {
      return { success: false, message: 'Email or username is required.' };
    }

    const user = body.email
      ? await this.usersService.getByEmail(body.email)
      : await this.usersService.getByName(body.name!);
    if (!user) return { success: false, message: 'No such user.' };

    const ok = await this.usersService.verify(user.name, body.password);
    if (!ok) return { success: false, message: 'Invalid credentials.' };

    await this.usersService.addIp(user.name, ip);
    const token = await this.authService.sign(user.name);
    return { success: true, accessToken: token.access_token };
  }

  @Get('profile')
  async profile(@CurrentUser() payload: JwtPayload) {
    const user = await this.usersService.getByName(payload.name);
    if (!user) return { success: false, message: 'User not found' };
    return { success: true, name: user.name, email: user.email };
  }
}
