import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MqttService, DevicesState } from './mqtt.service';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/realtime',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly mqttService: MqttService) {}

  afterInit() {
    this.mqttService.state$.subscribe((state: DevicesState) => {
      this.server.emit('state', { devices: state, timestamp: Date.now() });
    });
  }

  handleConnection(client: import('socket.io').Socket) {
    client.emit('state', {
      devices: this.mqttService.getState(),
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('getState')
  handleGetState(client: import('socket.io').Socket) {
    client.emit('state', {
      devices: this.mqttService.getState(),
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('command')
  handleCommand(
    _client: import('socket.io').Socket,
    payload: { deviceId: string; command: 'toggle' | 'on' | 'off' },
  ) {
    if (payload?.deviceId && payload?.command) {
      this.mqttService.publishCommand(payload.deviceId, payload.command);
    }
  }
}
