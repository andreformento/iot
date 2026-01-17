import { Controller, Get, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceService } from './device.service';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get(':ip/state')
  async getState(@Param('ip') ip: string) {
    try {
      return await this.deviceService.getState(ip);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Failed to communicate with IoT device',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post(':ip/toggle')
  async toggle(@Param('ip') ip: string) {
    try {
      return await this.deviceService.toggle(ip);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Failed to communicate with IoT device',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post(':ip/on')
  async turnOn(@Param('ip') ip: string) {
    try {
      return await this.deviceService.turnOn(ip);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Failed to communicate with IoT device',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post(':ip/off')
  async turnOff(@Param('ip') ip: string) {
    try {
      return await this.deviceService.turnOff(ip);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Failed to communicate with IoT device',
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
