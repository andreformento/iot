import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DeviceService {
  private readonly timeout = 2000;

  private getDeviceUrl(ip: string): string {
    return `http://${ip}`;
  }

  async getState(ip: string) {
    try {
      const response = await axios.get(`${this.getDeviceUrl(ip)}/state`, {
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get state from device ${ip}: ${error.message}`);
    }
  }

  async toggle(ip: string) {
    try {
      const response = await axios.post(`${this.getDeviceUrl(ip)}/toggle`, null, {
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to toggle device ${ip}: ${error.message}`);
    }
  }

  async turnOn(ip: string) {
    try {
      const response = await axios.post(`${this.getDeviceUrl(ip)}/on`, null, {
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to turn on device ${ip}: ${error.message}`);
    }
  }

  async turnOff(ip: string) {
    try {
      const response = await axios.post(`${this.getDeviceUrl(ip)}/off`, null, {
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to turn off device ${ip}: ${error.message}`);
    }
  }
}
