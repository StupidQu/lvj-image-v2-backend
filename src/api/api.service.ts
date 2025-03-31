import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Challenge } from './entity/challenge.entity';
import { ApiUpload } from './entity/api-upload.entity';
import * as crypto from 'crypto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class ApiService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(ApiUpload)
    private apiUploadRepository: Repository<ApiUpload>,
    private uploadService: UploadService,
  ) {}

  // 创建工作量证明挑战
  async createChallenge(ip: string): Promise<Challenge> {
    // 检查 24 小时内 IP 上传的图片数量
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const uploadsLast24Hours = await this.apiUploadRepository.count({
      where: {
        ip,
        createdAt: MoreThanOrEqual(oneDayAgo),
      },
    });

    // 根据 24 小时内上传的图片数量计算难度 N
    // N = max(4, min(20, log_1.5(16*X)))
    let N = 4;
    if (uploadsLast24Hours > 0) {
      const x = uploadsLast24Hours;
      const calculatedN = Math.floor(Math.log(16 * x) / Math.log(1.5));
      N = Math.max(4, Math.min(20, calculatedN));
    }

    // 生成64字节随机前缀
    const pref = crypto.randomBytes(64).toString('hex');

    // 创建挑战
    const challenge = new Challenge();
    challenge.pref = pref;
    challenge.N = N;
    challenge.ip = ip;
    challenge.createdAt = new Date();

    return this.challengeRepository.save(challenge);
  }

  // 验证工作量证明
  async validateChallenge(
    taskId: string,
    suff: string,
    ip: string,
  ): Promise<boolean> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: taskId },
    });

    if (!challenge) {
      throw new BadRequestException('无效的任务ID');
    }

    // 验证IP是否一致
    if (challenge.ip !== ip) {
      throw new BadRequestException('IP地址不匹配');
    }

    // 验证任务是否已过期（60秒内）
    const now = new Date();
    const taskTime = challenge.createdAt.getTime();
    if (now.getTime() - taskTime > 60 * 1000) {
      throw new BadRequestException('任务已过期');
    }

    // 验证工作量证明 - 正确处理二进制字节
    try {
      // 将十六进制字符串转换为Buffer
      const prefBuffer = Buffer.from(challenge.pref, 'hex');
      const suffBuffer = Buffer.from(suff, 'hex');

      // 合并两个Buffer
      const combinedBuffer = Buffer.concat([prefBuffer, suffBuffer]);

      // 计算SHA-256哈希
      const hash = crypto.createHash('sha256').update(combinedBuffer).digest();

      // 检查前N位(bit)是否都是0
      const bitsToCheck = challenge.N;
      let currentBit = 0;

      for (let i = 0; i < Math.ceil(bitsToCheck / 8); i++) {
        const byte = hash[i];

        // 检查这个字节中的每一位
        for (let j = 0; j < 8 && currentBit < bitsToCheck; j++) {
          const bitIsSet = (byte & (1 << (7 - j))) !== 0;
          if (bitIsSet) {
            throw new BadRequestException('工作量证明验证失败');
          }
          currentBit++;
        }
      }
    } catch {
      throw new BadRequestException('无效的后缀格式');
    }

    // 更新挑战状态
    challenge.solvedAt = now;
    challenge.suff = suff;
    await this.challengeRepository.save(challenge);

    return true;
  }

  // 处理API上传
  async handleApiUpload(
    taskId: string,
    suff: string,
    file: Express.Multer.File,
    ip: string,
  ): Promise<ApiUpload> {
    // 验证工作量证明
    await this.validateChallenge(taskId, suff, ip);

    // 处理图片
    const processedFile = await this.uploadService.preprocess(file);

    // 计算SHA256
    const sha256 = crypto
      .createHash('sha256')
      .update(processedFile)
      .digest('hex');

    // 生成文件名
    const name = `${sha256}.png`;

    // 使用上传服务的方法上传到七牛云
    const result = await this.uploadService.uploadToQiniu(processedFile, name);
    if (!result.ok()) {
      throw new BadRequestException('上传失败');
    }

    // 生成URL
    const url = `${process.env.IMAGE_BASEURL}/${name}`;

    // 保存记录
    const apiUpload = new ApiUpload();
    apiUpload.sha256 = sha256;
    apiUpload.url = url;
    apiUpload.ip = ip;
    apiUpload.createdAt = new Date();

    return this.apiUploadRepository.save(apiUpload);
  }
}
