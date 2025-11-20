import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileSizeValidationPipe } from './upload.pipe';
import {
  CurrentUser,
  JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { UsersService } from 'src/users/users.service';
import * as lodash from 'lodash';
import { TurnstileVerify } from 'turnstile-verify';
import { RealIP } from 'nestjs-real-ip';

@Controller('upload')
@UsePipes(FileSizeValidationPipe)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Get('/challenge')
  async getChallenge(@CurrentUser() up: JwtPayload) {
    const user = await this.usersService.getByName(up.name);
    const turnstile = await this.uploadService.shouldTurnstile(user!);
    return { turnstile };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('file'))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('turnstileToken') turnstileToken: string,
    @Body('useShortlink', new DefaultValuePipe(true), ParseBoolPipe)
    useShortlink: boolean,
    @CurrentUser() up: JwtPayload,
    @RealIP() ip: string,
  ) {
    const user = await this.usersService.getByName(up.name);
    const shouldTurnstile = await this.uploadService.shouldTurnstile(user!);

    if (shouldTurnstile) {
      const turnstile = new TurnstileVerify({
        token: process.env.CLOUDFLAER_TURNSTILE_SECRET!,
      });

      const turnstileResponse = await turnstile.validate({
        response: turnstileToken,
        remoteip: ip,
      });

      if (!turnstileResponse.valid)
        throw new BadRequestException('Invalid captcha');
    }

    const uploads = [];
    for (const file of files) {
      const processed = await this.uploadService.preprocess(file);
      const upload = await this.uploadService.upload(
        processed,
        user!,
        useShortlink,
      );
      uploads.push(lodash.omit(upload, ['user']));
    }

    return uploads;
  }

  @Get('/history')
  async getHistory(
    @CurrentUser() up: JwtPayload,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ) {
    if (take > 50) throw new BadRequestException('Take too many images');
    const user = await this.usersService.getByName(up.name);
    const history = await this.uploadService.getHistory(user!, skip, take);
    return history;
  }
}
