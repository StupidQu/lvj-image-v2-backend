import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

type File = Express.Multer.File;

@Injectable()
export class FileSizeValidationPipe implements PipeTransform<File, File> {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (metadata.type !== 'body') {
      return value;
    }

    const maxSizeInBytes = 2 * 1024 * 1024;

    // 检查value是否为File类型
    if (value && typeof value === 'object' && 'size' in value) {
      if ((value as File).size > maxSizeInBytes) {
        throw new BadRequestException(
          `The file size must be less than ${maxSizeInBytes / (1024 * 1024)}MB`,
        );
      }
    }

    return value;
  }
}
