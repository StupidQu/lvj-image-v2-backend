import { Test, TestingModule } from '@nestjs/testing';
import { ShortlinkController } from './shortlink.controller';

describe('ShortlinkController', () => {
  let controller: ShortlinkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortlinkController],
    }).compile();

    controller = module.get<ShortlinkController>(ShortlinkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
