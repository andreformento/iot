import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { EventsGateway } from './events.gateway';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private readonly deviceStates = new Map<string, any>();

  constructor(private eventsGateway: EventsGateway) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;

    this.logger.log(`Connecting to MQTT broker: ${brokerUrl}`);

    const options: mqtt.IClientOptions = {
      username,
      password,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      clean: true,
      clientId: `iot-api-${Math.random().toString(16).substring(2, 8)}`,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.logger.log('✓ Connected to MQTT broker');

      // Subscribe to all device topics
      this.client.subscribe('devices/+/sensors/#', (err) => {
        if (err) {
          this.logger.error('Failed to subscribe to sensor topics', err);
        } else {
          this.logger.log('✓ Subscribed to: devices/+/sensors/#');
        }
      });

      this.client.subscribe('devices/+/status', (err) => {
        if (err) {
          this.logger.error('Failed to subscribe to status topics', err);
        } else {
          this.logger.log('✓ Subscribed to: devices/+/status');
        }
      });
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT error:', error);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });

    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed');
    });
  }

  private handleMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString());
      this.logger.debug(`Message received on ${topic}:`, message);

      // Extract device ID from topic (devices/{deviceId}/...)
      const topicParts = topic.split('/');
      const deviceId = topicParts[1];

      // Update device state cache
      if (!this.deviceStates.has(deviceId)) {
        this.deviceStates.set(deviceId, {});
      }
      const deviceState = this.deviceStates.get(deviceId);

      // Handle different message types
      if (topic.includes('/sensors/')) {
        // Sensor data update
        const sensorType = message.sensor || 'unknown';
        deviceState[sensorType] = message;
        deviceState.lastUpdate = new Date();

        this.logger.log(`Device ${deviceId} - ${sensorType}: ${JSON.stringify(message)}`);

        // Broadcast to connected web clients via Socket.IO
        this.eventsGateway.broadcastDeviceUpdate(deviceId, {
          type: 'sensor',
          deviceId,
          data: message,
          timestamp: new Date(),
        });
      } else if (topic.includes('/status')) {
        // Device status update
        deviceState.status = message.status;
        deviceState.ip = message.ip;
        deviceState.rssi = message.rssi;
        deviceState.lastSeen = new Date();

        this.logger.log(`Device ${deviceId} status: ${message.status}`);

        this.eventsGateway.broadcastDeviceUpdate(deviceId, {
          type: 'status',
          deviceId,
          data: message,
          timestamp: new Date(),
        });
      }

      this.deviceStates.set(deviceId, deviceState);
    } catch (error) {
      this.logger.error('Error handling MQTT message:', error);
    }
  }

  // Send command to device
  sendCommand(deviceId: string, command: string) {
    const topic = `devices/${deviceId}/commands`;
    const payload = JSON.stringify({ command, timestamp: new Date() });

    this.logger.log(`Sending command to ${deviceId}: ${command}`);

    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Failed to send command to ${deviceId}:`, error);
        throw error;
      }
    });
  }

  // Get cached device state
  getDeviceState(deviceId: string) {
    return this.deviceStates.get(deviceId) || null;
  }

  // Get all devices
  getAllDevices() {
    const devices = [];
    for (const [deviceId, state] of this.deviceStates.entries()) {
      devices.push({
        deviceId,
        ...state,
      });
    }
    return devices;
  }
}
