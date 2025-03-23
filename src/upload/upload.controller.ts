import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
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

@Controller('upload')
@UsePipes(FileSizeValidationPipe)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('file'))
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() up: JwtPayload,
  ) {
    const user = await this.usersService.getByName(up.name);

    const uploads = [];
    for (const file of files) {
      const processed = await this.uploadService.preprocess(file);
      const upload = await this.uploadService.upload(processed, user!);
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
