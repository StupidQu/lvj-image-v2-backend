import { Module } from '@nestjs/common';
import { ShortlinkController } from './shortlink.controller';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ShortlinkController],
})
export class ShortlinkModule {}
