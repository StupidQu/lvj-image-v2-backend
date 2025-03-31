import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './entity/challenge.entity';
import { ApiUpload } from './entity/api-upload.entity';
import { UploadModule } from 'src/upload/upload.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Challenge, ApiUpload]),
    UploadModule,
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
