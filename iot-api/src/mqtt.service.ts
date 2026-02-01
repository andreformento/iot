import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { BehaviorSubject, Observable } from 'rxjs';

const LED_STATE_PATTERN = 'device/+/led/state';
const LIGHT_STATE_PATTERN = 'device/+/light/state';
const STATUS_PATTERN = 'device/+/status';

export interface RealtimeState {
  led: { on: boolean; pin: number } | null;
  light: 'on' | 'off' | null;
}

export type DevicesState = Record<string, RealtimeState>;

function parseDeviceIdFromTopic(topic: string): string | null {
  const parts = topic.split('/');
  if (parts.length >= 2) return parts[1];
  return null;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private devices = new Map<string, RealtimeState>();
  private readonly stateSubject = new BehaviorSubject<DevicesState>({});

  onModuleInit() {
    const url = process.env.MQTT_URL || 'mqtt://localhost:1883';
    this.client = mqtt.connect(url);
    this.client.on('connect', () => {
      this.client!.subscribe(LED_STATE_PATTERN);
      this.client!.subscribe(LIGHT_STATE_PATTERN);
      this.client!.subscribe(STATUS_PATTERN);
    });
    this.client.on('message', (topic, payload) => {
      const deviceId = parseDeviceIdFromTopic(topic);
      if (!deviceId) return;

      if (topic.endsWith('/status')) {
        if (payload.toString().toLowerCase() === 'offline') {
          this.devices.delete(deviceId);
          this.emitState();
        }
        return;
      }

      const current = this.devices.get(deviceId) ?? {
        led: null,
        light: null,
      };

      if (topic.endsWith('/led/state')) {
        try {
          current.led = JSON.parse(payload.toString());
        } catch {
          // ignore invalid json
        }
      } else if (topic.endsWith('/light/state')) {
        const raw = payload.toString().toLowerCase();
        current.light = raw === 'on' ? 'on' : raw === 'off' ? 'off' : null;
      }

      this.devices.set(deviceId, current);
      this.emitState();
    });
  }

  private emitState(): void {
    const snapshot: DevicesState = {};
    this.devices.forEach((state, id) => {
      snapshot[id] = state;
    });
    this.stateSubject.next(snapshot);
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  getState(): DevicesState {
    const snapshot: DevicesState = {};
    this.devices.forEach((state, id) => {
      snapshot[id] = state;
    });
    return snapshot;
  }

  get state$(): Observable<DevicesState> {
    return this.stateSubject.asObservable();
  }

  publishCommand(deviceId: string, command: 'toggle' | 'on' | 'off'): void {
    if (this.client?.connected) {
      this.client.publish(`device/${deviceId}/led/command`, command);
    }
  }
}
