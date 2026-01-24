'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface DeviceData {
  sensor?: string;
  detected?: boolean;
  state?: string;
  timestamp?: number;
  status?: string;
  ip?: string;
  rssi?: number;
}

interface DeviceUpdate {
  type: 'sensor' | 'status';
  deviceId: string;
  data: DeviceData;
  timestamp: Date;
}

export default function Home() {
  const [deviceId, setDeviceId] = useState('esp32-device-001');
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<DeviceUpdate | null>(null);
  const [lightDetected, setLightDetected] = useState<boolean | null>(null);
  const [ledState, setLedState] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('initial-state', (data: { devices: any[] }) => {
      console.log('Initial state received:', data);
      // Find our device in the initial state
      const device = data.devices.find(d => d.deviceId === deviceId);
      if (device) {
        updateDeviceState(device);
      }
    });

    socket.on('device-update', (update: DeviceUpdate) => {
      console.log('Device update:', update);

      if (update.deviceId === deviceId) {
        setLastUpdate(update);

        if (update.type === 'sensor') {
          if (update.data.sensor === 'light') {
            setLightDetected(update.data.detected ?? null);
          } else if (update.data.sensor === 'led') {
            setLedState(update.data.state ?? null);
          }
        } else if (update.type === 'status') {
          setDeviceStatus(update.data.status ?? 'unknown');
        }
      }
    });

    socket.on('command-ack', (data: { success: boolean; command: string; error?: string }) => {
      setLoading(false);
      if (!data.success) {
        console.error('Command failed:', data.error);
        alert(`Command failed: ${data.error}`);
      }
    });

    // Request current device state
    socket.emit('get-device-state', { deviceId });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('initial-state');
      socket.off('device-update');
      socket.off('command-ack');
    };
  }, [deviceId]);

  const updateDeviceState = (device: any) => {
    if (device.light) {
      setLightDetected(device.light.detected);
    }
    if (device.led) {
      setLedState(device.led.state);
    }
    if (device.status) {
      setDeviceStatus(device.status);
    }
  };

  const sendCommand = useCallback((command: string) => {
    setLoading(true);
    const socket = getSocket();
    socket.emit('device-command', { deviceId, command });
  }, [deviceId]);

  const handleLedOn = () => sendCommand('LED_ON');
  const handleLedOff = () => sendCommand('LED_OFF');
  const handleLedToggle = () => sendCommand('LED_TOGGLE');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6">
          IoT Control Panel
        </h1>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">API Connection</span>
            <span className={`flex items-center text-sm font-semibold ${connected ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Device Status</span>
            <span className="text-sm font-semibold text-blue-400">{deviceStatus}</span>
          </div>
        </div>

        {/* Device ID Input */}
        <div className="mb-6">
          <label htmlFor="deviceId" className="block text-sm font-medium text-slate-300 mb-2">
            Device ID
          </label>
          <input
            type="text"
            id="deviceId"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="esp32-device-001"
          />
        </div>

        {/* Light Sensor Status */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">Light Sensor</p>
          {lightDetected !== null ? (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {lightDetected ? '💡 Light Detected' : '🌑 Dark'}
              </span>
            </div>
          ) : (
            <span className="text-lg text-slate-500">Waiting for data...</span>
          )}
        </div>

        {/* LED Status */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">LED Status</p>
          {ledState ? (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {ledState === 'on' ? '🔴 ON' : '⚫ OFF'}
              </span>
            </div>
          ) : (
            <span className="text-lg text-slate-500">Unknown</span>
          )}
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleLedOn}
            disabled={loading || !connected}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Turn On
          </button>
          <button
            onClick={handleLedOff}
            disabled={loading || !connected}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Turn Off
          </button>
          <button
            onClick={handleLedToggle}
            disabled={loading || !connected}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Toggle
          </button>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="p-3 bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-500">
              Last update: {new Date(lastUpdate.timestamp).toLocaleTimeString()} ({lastUpdate.type})
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500 text-center">
          Real-time IoT monitoring via MQTT + Socket.IO
        </p>
      </div>
    </div>
  );
}
