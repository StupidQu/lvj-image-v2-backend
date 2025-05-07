import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { UploadService } from 'src/upload/upload.service';

@Controller('i')
export class ShortlinkController {
  constructor(private readonly uploadService: UploadService) {}

  @Get(':id')
  @Public()
  async redirect(@Param('id') id: string) {
    let upload;

    const numId = Number(id);
    if (!isNaN(numId) && Number.isInteger(numId) && numId > 0) {
      upload = await this.uploadService.getById(numId);
    }

    if (!upload) {
      upload = await this.uploadService.getByLegacyShortlink(id);
    }

    if (!upload) {
      throw new NotFoundException('图片未找到');
    }

    // Check if shortlink access is allowed for this upload
    if (!upload.useShortlink) {
      throw new NotFoundException('此图片不允许通过短链访问');
    }

    // 返回重定向URL
    return {
      url: upload.url,
    };
  }
}
