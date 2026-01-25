import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MqttService } from './mqtt.service';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to your domain
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => MqttService))
    private mqttService: MqttService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send current device states to newly connected client
    const devices = this.mqttService.getAllDevices();
    client.emit('initial-state', { devices });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('device-command')
  handleDeviceCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string; command: string },
  ) {
    this.logger.log(
      `Command from client ${client.id}: ${data.command} to device ${data.deviceId}`,
    );

    try {
      // TODO: Add authentication/authorization here
      // Check if user owns this device before sending command

      this.mqttService.sendCommand(data.deviceId, data.command);

      // Send acknowledgment
      client.emit('command-ack', {
        success: true,
        deviceId: data.deviceId,
        command: data.command,
      });
    } catch (error) {
      this.logger.error('Error sending command:', error);
      client.emit('command-ack', {
        success: false,
        deviceId: data.deviceId,
        command: data.command,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('get-device-state')
  handleGetDeviceState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ) {
    const state = this.mqttService.getDeviceState(data.deviceId);
    client.emit('device-state', {
      deviceId: data.deviceId,
      state,
    });
  }

  @SubscribeMessage('get-all-devices')
  handleGetAllDevices(@ConnectedSocket() client: Socket) {
    const devices = this.mqttService.getAllDevices();
    client.emit('all-devices', { devices });
  }

  // Broadcast device updates to all connected clients
  broadcastDeviceUpdate(deviceId: string, update: any) {
    this.server.emit('device-update', update);
  }

  // Send update to specific client
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }
}
