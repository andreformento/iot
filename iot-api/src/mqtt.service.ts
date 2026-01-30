import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';

const STATE_TOPIC = 'device/led/state';
const COMMAND_TOPIC = 'device/led/command';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private lastState: { on: boolean; pin: number } | null = null;

  onModuleInit() {
    const url = process.env.MQTT_URL || 'mqtt://localhost:1883';
    this.client = mqtt.connect(url);
    this.client.on('connect', () => {
      this.client!.subscribe(STATE_TOPIC);
    });
    this.client.on('message', (topic, payload) => {
      if (topic === STATE_TOPIC) {
        try {
          this.lastState = JSON.parse(payload.toString());
        } catch {
          // ignore invalid json
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  getState(): { on: boolean; pin: number } | null {
    return this.lastState;
  }

  publishCommand(command: 'toggle' | 'on' | 'off'): void {
    if (this.client?.connected) {
      this.client.publish(COMMAND_TOPIC, command);
    }
  }
}
