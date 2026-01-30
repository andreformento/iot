import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { BehaviorSubject, Observable } from 'rxjs';

const LED_STATE_TOPIC = 'device/led/state';
const LIGHT_STATE_TOPIC = 'device/light/state';
const COMMAND_TOPIC = 'device/led/command';

export interface RealtimeState {
  led: { on: boolean; pin: number } | null;
  light: 'on' | 'off' | null;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private lastLedState: { on: boolean; pin: number } | null = null;
  private lastLightState: 'on' | 'off' | null = null;
  private readonly stateSubject = new BehaviorSubject<RealtimeState>({
    led: null,
    light: null,
  });

  onModuleInit() {
    const url = process.env.MQTT_URL || 'mqtt://localhost:1883';
    this.client = mqtt.connect(url);
    this.client.on('connect', () => {
      this.client!.subscribe(LED_STATE_TOPIC);
      this.client!.subscribe(LIGHT_STATE_TOPIC);
    });
    this.client.on('message', (topic, payload) => {
      if (topic === LED_STATE_TOPIC) {
        try {
          this.lastLedState = JSON.parse(payload.toString());
          this.emitState();
        } catch {
          // ignore invalid json
        }
      } else if (topic === LIGHT_STATE_TOPIC) {
        const raw = payload.toString().toLowerCase();
        this.lastLightState = raw === 'on' ? 'on' : raw === 'off' ? 'off' : null;
        this.emitState();
      }
    });
  }

  private emitState(): void {
    this.stateSubject.next({
      led: this.lastLedState,
      light: this.lastLightState,
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  getState(): RealtimeState {
    return {
      led: this.lastLedState,
      light: this.lastLightState,
    };
  }

  get state$(): Observable<RealtimeState> {
    return this.stateSubject.asObservable();
  }

  publishCommand(command: 'toggle' | 'on' | 'off'): void {
    if (this.client?.connected) {
      this.client.publish(COMMAND_TOPIC, command);
    }
  }
}
