'use client';

import { useState } from 'react';
import { api, DeviceState } from '@/lib/api';

export default function Home() {
  const [deviceIp, setDeviceIp] = useState('192.168.0.15');
  const [state, setState] = useState<DeviceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateIp = (ip: string): boolean => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return pattern.test(ip);
  };

  const fetchState = async () => {
    if (!validateIp(deviceIp)) {
      setError('Invalid IP address format');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await api.getState(deviceIp);
      setState(data);
    } catch (err) {
      setError('Device unreachable');
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (command: 'on' | 'off' | 'toggle') => {
    if (!validateIp(deviceIp)) {
      setError('Invalid IP address format');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (command === 'on') await api.turnOn(deviceIp);
      else if (command === 'off') await api.turnOff(deviceIp);
      else await api.toggle(deviceIp);

      await fetchState();
    } catch (err) {
      setError('Failed to send command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6">
          IoT Control Panel
        </h1>

        {/* IP Input */}
        <div className="mb-6">
          <label htmlFor="deviceIp" className="block text-sm font-medium text-slate-300 mb-2">
            Device IP Address
          </label>
          <input
            type="text"
            id="deviceIp"
            value={deviceIp}
            onChange={(e) => setDeviceIp(e.target.value)}
            onBlur={fetchState}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="192.168.0.15"
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Status */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Status</p>
          {state ? (
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {state.on ? 'ON' : 'OFF'}
              </span>
              <span className="text-sm text-slate-400">Pin: {state.pin}</span>
            </div>
          ) : (
            <span className="text-lg text-slate-500">Unknown</span>
          )}
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleCommand('on')}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Turn On
          </button>
          <button
            onClick={() => handleCommand('off')}
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Turn Off
          </button>
          <button
            onClick={() => handleCommand('toggle')}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 active:scale-95"
          >
            Toggle
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Enter your IoT agent's IP address and control the LED remotely
        </p>
      </div>
    </div>
  );
}
