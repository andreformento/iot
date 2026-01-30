import { Controller, Get, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DeviceService } from './device.service';
import { MqttService } from './mqtt.service';

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly mqttService: MqttService,
  ) {}

  @Get('mqtt/state')
  getMqttState() {
    const state = this.mqttService.getState();
    if (state === null) {
      throw new HttpException(
        { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'No MQTT state yet' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return state;
  }

  @Post('mqtt/toggle')
  mqttToggle() {
    this.mqttService.publishCommand('toggle');
    return { action: 'toggle' };
  }

  @Post('mqtt/on')
  mqttOn() {
    this.mqttService.publishCommand('on');
    return { action: 'on' };
  }

  @Post('mqtt/off')
  mqttOff() {
    this.mqttService.publishCommand('off');
    return { action: 'off' };
  }

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
