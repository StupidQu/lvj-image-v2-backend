import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UploadService } from './upload.service';
import { Upload } from './entity/upload.entity';
import { User } from 'src/users/entity/user.entity';

describe('UploadService', () => {
  let service: UploadService;

  const uploadRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const user = { id: 1 } as User;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: getRepositoryToken(Upload),
          useValue: uploadRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should request captcha after 10 uploads within 3 hours', async () => {
    jest
      .spyOn(
        service as unknown as { countUploadsWithin: jest.Mock },
        'countUploadsWithin',
      )
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(service.shouldTurnstile(user)).resolves.toBe(true);
  });

  it('should request captcha after 30 uploads in a day', async () => {
    jest
      .spyOn(
        service as unknown as { countUploadsWithin: jest.Mock },
        'countUploadsWithin',
      )
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(0);

    await expect(service.shouldTurnstile(user)).resolves.toBe(true);
  });

  it('should request captcha after 200 uploads in a week', async () => {
    jest
      .spyOn(
        service as unknown as { countUploadsWithin: jest.Mock },
        'countUploadsWithin',
      )
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(200);

    await expect(service.shouldTurnstile(user)).resolves.toBe(true);
  });

  it('should not request captcha below all trigger thresholds', async () => {
    jest
      .spyOn(
        service as unknown as { countUploadsWithin: jest.Mock },
        'countUploadsWithin',
      )
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(29)
      .mockResolvedValueOnce(199);

    await expect(service.shouldTurnstile(user)).resolves.toBe(false);
  });
});
