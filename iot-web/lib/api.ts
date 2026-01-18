import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DeviceState {
  on: boolean;
  pin: number;
}

export interface DeviceAction {
  on: boolean;
  action: string;
}

export const api = {
  // Health check
  async health() {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  },

  // Get device state
  async getState(ip: string): Promise<DeviceState> {
    const response = await axios.get(`${API_URL}/devices/${ip}/state`, {
      timeout: 2000,
    });
    return response.data;
  },

  // Toggle device
  async toggle(ip: string): Promise<DeviceAction> {
    const response = await axios.post(`${API_URL}/devices/${ip}/toggle`, null, {
      timeout: 2000,
    });
    return response.data;
  },

  // Turn device on
  async turnOn(ip: string): Promise<DeviceAction> {
    const response = await axios.post(`${API_URL}/devices/${ip}/on`, null, {
      timeout: 2000,
    });
    return response.data;
  },

  // Turn device off
  async turnOff(ip: string): Promise<DeviceAction> {
    const response = await axios.post(`${API_URL}/devices/${ip}/off`, null, {
      timeout: 2000,
    });
    return response.data;
  },
};
