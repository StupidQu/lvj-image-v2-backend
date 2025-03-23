import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { Upload } from './entity/upload.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Upload]),
    UsersModule,
  ],
  providers: [UploadService],
  exports: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
