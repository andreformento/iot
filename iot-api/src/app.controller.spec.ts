import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return HTML page', () => {
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      appController.getRoot(mockResponse as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8'
      );
      expect(mockResponse.send).toHaveBeenCalled();

      const html = mockResponse.send.mock.calls[0][0];
      expect(html).toContain('IoT Control Panel');
      expect(html).toContain('deviceIp');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'iot-api');
    });
  });
});
