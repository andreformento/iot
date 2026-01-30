import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { MqttService } from './mqtt.service';

@Module({
  imports: [],
  controllers: [AppController, DeviceController],
  providers: [DeviceService, MqttService],
})
export class AppModule {}
