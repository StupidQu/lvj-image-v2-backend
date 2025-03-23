import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async sign(name: string) {
    const user = await this.usersService.getByName(name);
    if (!user) throw new UnauthorizedException();

    const payload = { name, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
