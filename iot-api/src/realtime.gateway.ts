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
      this.server.emit('state', state);
    });
  }

  handleConnection(client: import('socket.io').Socket) {
    client.emit('state', this.mqttService.getState());
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
