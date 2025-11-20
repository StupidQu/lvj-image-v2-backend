import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Upload } from './entity/upload.entity';
import { Between, Repository } from 'typeorm';
import { Jimp } from 'jimp';
import * as crypto from 'crypto';
import * as qiniu from 'qiniu';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class UploadService {
  private static readonly DAILY_UPLOAD_LIMIT = 20;
  private static readonly MONTHLY_UPLOAD_LIMIT = 200;
  private qiniuMac: qiniu.auth.digest.Mac;

  constructor(
    @InjectRepository(Upload)
    private uploadRepository: Repository<Upload>,
    private configService: ConfigService,
  ) {
    this.qiniuMac = new qiniu.auth.digest.Mac(
      this.configService.get('QINIU_ACCESS_KEY'),
      this.configService.get('QINIU_SECRET_KEY'),
    );
  }

  public async uploadToQiniu(file: Buffer, key: string) {
    const policy = new qiniu.rs.PutPolicy({
      scope: `${this.configService.get('QINIU_BUCKET')}:${key}`,
    });

    const token = policy.uploadToken(this.qiniuMac);
    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    const response = await formUploader.put(token, key, file, putExtra);
    return response;
  }

  async preprocess(file: Express.Multer.File) {
    try {
      const image = await Jimp.read(file.buffer);

      const width = image.width;
      const height = image.height;

      const longSide = Math.max(width, height);
      const MAX_SIZE = 1600;

      if (longSide > MAX_SIZE) {
        if (width >= height) {
          image.resize({ w: MAX_SIZE });
        } else {
          image.resize({ h: MAX_SIZE });
        }
      }

      const buffer = await image.getBuffer('image/png');
      return buffer;
    } catch (error) {
      throw new Error(
        `图片处理失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async upload(file: Buffer, user: User, useShortlink: boolean = true) {
    const sha256 = crypto.createHash('sha256').update(file).digest('hex');
    let upload = await this.uploadRepository.findOne({
      where: {
        sha256,
      },
    });
    if (upload) return upload;

    await this.ensureUploadLimits(user);

    const name = `${sha256}.png`;
    const result = await this.uploadToQiniu(file, name);
    if (!result.ok()) {
      throw new InternalServerErrorException(
        'Failed to upload to Qiniu Cloud.',
      );
    }
    const url = `${process.env.IMAGE_BASEURL}/${name}`;

    upload = new Upload();
    upload.sha256 = sha256;
    upload.url = url;
    upload.size = file.byteLength;
    upload.user = user;
    upload.useShortlink = useShortlink;

    await this.uploadRepository.save(upload);
    return upload;
  }

  async getHistory(
    user: User,
    skip: number,
    take: number,
  ): Promise<{
    uploads: Upload[];
    total: number;
  }> {
    const [uploads, total] = await this.uploadRepository.findAndCount({
      where: {
        user,
      },
      skip,
      take,
    });
    return {
      uploads,
      total,
    };
  }

  async getById(id: number) {
    return this.uploadRepository.findOneBy({ id });
  }

  async getByLegacyShortlink(link: string) {
    return this.uploadRepository.findOneBy({ legacyShortlink: link });
  }

  async shouldTurnstile(user: User): Promise<boolean> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [count3h, count7d] = await Promise.all([
      this.countUploadsWithin(user, threeHoursAgo, now),
      this.countUploadsWithin(user, sevenDaysAgo, now),
    ]);

    if (count3h < 5 && count7d < 20) {
      return false;
    }

    return true;
  }

  private async ensureUploadLimits(user: User) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [dailyCount, monthlyCount] = await Promise.all([
      this.countUploadsWithin(user, startOfDay, now),
      this.countUploadsWithin(user, startOfMonth, now),
    ]);

    if (dailyCount >= UploadService.DAILY_UPLOAD_LIMIT) {
      throw new BadRequestException(
        `Daily upload limit of ${UploadService.DAILY_UPLOAD_LIMIT} reached.`,
      );
    }

    if (monthlyCount >= UploadService.MONTHLY_UPLOAD_LIMIT) {
      throw new BadRequestException(
        `Monthly upload limit of ${UploadService.MONTHLY_UPLOAD_LIMIT} reached.`,
      );
    }
  }

  private async countUploadsWithin(user: User, start: Date, end: Date) {
    return this.uploadRepository.count({
      where: {
        user: {
          id: user.id,
        },
        createdAt: Between(start, end),
      },
    });
  }
}
