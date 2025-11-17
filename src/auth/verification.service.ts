import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EmailVerification } from './entity/email-verification.entity';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(EmailVerification)
    private verificationRepository: Repository<EmailVerification>,
  ) {}

  /**
   * 生成6位数字验证码
   */
  generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * 检查发送频率限制
   * 1. 同一邮箱60秒内只能发送一次
   * 2. 同一IP每天最多发送10次
   */
  async checkSendLimit(
    email: string,
    ip: string,
  ): Promise<{
    canSend: boolean;
    reason?: string;
  }> {
    const now = new Date();

    // 检查邮箱60秒限制
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentEmailCode = await this.verificationRepository.findOne({
      where: {
        email,
        createdAt: MoreThan(oneMinuteAgo),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentEmailCode) {
      return {
        canSend: false,
        reason: '发送过于频繁，请60秒后再试',
      };
    }

    // 检查IP每天10次限制
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ipSendCount = await this.verificationRepository.count({
      where: {
        ip,
        createdAt: MoreThan(todayStart),
      },
    });

    if (ipSendCount >= 10) {
      return {
        canSend: false,
        reason: '今日发送次数已达上限',
      };
    }

    return { canSend: true };
  }

  /**
   * 创建验证码记录
   */
  async createVerification(email: string, ip: string): Promise<string> {
    const code = this.generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟后过期

    const verification = new EmailVerification();
    verification.email = email;
    verification.code = code;
    verification.ip = ip;
    verification.expiresAt = expiresAt;
    verification.isUsed = false;

    await this.verificationRepository.save(verification);

    return code;
  }

  /**
   * 验证码校验
   */
  async validateCode(
    email: string,
    code: string,
  ): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const verification = await this.verificationRepository.findOne({
      where: {
        email,
        code,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      return {
        valid: false,
        reason: '验证码错误',
      };
    }

    const now = new Date();
    if (now > verification.expiresAt) {
      return {
        valid: false,
        reason: '验证码已过期',
      };
    }

    return { valid: true };
  }

  /**
   * 标记验证码已使用
   */
  async markAsUsed(email: string, code: string): Promise<void> {
    await this.verificationRepository.update(
      {
        email,
        code,
        isUsed: false,
      },
      {
        isUsed: true,
      },
    );
  }
}

