import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiService } from './api.service';
import { RealIP } from 'nestjs-real-ip';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileSizeValidationPipe } from 'src/upload/upload.pipe';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('api')
@Public()
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('/challenge')
  async getChallenge(@RealIP() ip: string) {
    const challenge = await this.apiService.createChallenge(ip);
    return {
      success: true,
      ip,
      taskId: challenge.id,
      pref: challenge.pref,
      N: challenge.N,
    };
  }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(FileSizeValidationPipe) file: Express.Multer.File,
    @Body('taskId') taskId: string,
    @Body('suff') suff: string,
    @RealIP() ip: string,
  ) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    if (!taskId || !suff) {
      throw new BadRequestException('缺少必要参数');
    }

    const result = await this.apiService.handleApiUpload(
      taskId,
      suff,
      file,
      ip,
    );

    return {
      success: true,
      result: {
        id: result.id,
        sha256: result.sha256,
        url: result.url,
        ip: result.ip,
      },
    };
  }
}
