import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async register(name: string, password: string, email: string) {
    const _user = await Promise.all([
      this.getByEmail(email),
      this.getByName(name),
    ]);
    if (_user[0] || _user[1]) return false;

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');

    const user = new User();
    user.name = name;
    user.nameLower = name.toLocaleLowerCase();

    user.password = hash;
    user.salt = salt;
    user.email = email;
    user.ips = '';
    user.uploads = [];

    await this.userRepository.save(user);

    return user;
  }

  async verify(name: string, password: string) {
    const user = await this.getByName(name);
    if (!user) return false;

    const hash = crypto
      .pbkdf2Sync(password, user.salt, 1000, 64, 'sha512')
      .toString('hex');

    return hash === user.password;
  }

  async getByName(name: string) {
    const nameLower = name.toLocaleLowerCase();
    return this.userRepository.findOne({ where: { nameLower } });
  }

  async addIp(name: string, ip: string) {
    const user = await this.getByName(name);
    if (!user) return false;

    const ips = user.ips ? user.ips.split(',') : [];
    if (!ips.includes(ip)) {
      ips.push(ip);
      user.ips = ips.join(',');
      await this.userRepository.save(user);
    }
  }
}
