'use client';

import { useState, useEffect, useRef } from 'react';
import { api, DeviceState } from '@/lib/api';
import {
  createRealtimeSocket,
  RealtimeState as RealtimeStateType,
} from '@/lib/realtime';

export default function Home() {
  const [deviceIp, setDeviceIp] = useState('192.168.0.15');
  const [state, setState] = useState<DeviceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [realtimeState, setRealtimeState] = useState<RealtimeStateType | null>(
    null,
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);

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

  useEffect(() => {
    const socket = createRealtimeSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setRealtimeConnected(true);
    });
    socket.on('disconnect', () => {
      setRealtimeConnected(false);
    });
    socket.on('state', (payload: RealtimeStateType) => {
      setRealtimeState(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleRealtimeCommand = (command: 'on' | 'off' | 'toggle') => {
    socketRef.current?.emit('command', command);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 flex-1">
          <h2 className="text-xl font-bold text-white mb-4">HTTP</h2>
          <div className="mb-4">
            <label htmlFor="deviceIp" className="block text-sm font-medium text-slate-300 mb-2">
              Device IP
            </label>
            <input
              type="text"
              id="deviceIp"
              value={deviceIp}
              onChange={(e) => setDeviceIp(e.target.value)}
              onBlur={fetchState}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="192.168.0.15"
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
          <div className="mb-4 p-4 bg-slate-900 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Status</p>
            {state ? (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{state.on ? 'ON' : 'OFF'}</span>
                <span className="text-sm text-slate-400">Pin: {state.pin}</span>
              </div>
            ) : (
              <span className="text-lg text-slate-500">Unknown</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleCommand('on')}
              disabled={loading}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              On
            </button>
            <button
              onClick={() => handleCommand('off')}
              disabled={loading}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Off
            </button>
            <button
              onClick={() => handleCommand('toggle')}
              disabled={loading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Toggle
            </button>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-600 pt-8 md:pt-0 md:pl-8" />

        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 flex-1">
          <h2 className="text-xl font-bold text-white mb-4">Realtime</h2>
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-slate-500'}`}
            />
            <span className="text-sm text-slate-400">
              {realtimeConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="mb-4 p-4 bg-slate-900 rounded-lg space-y-2">
            <p className="text-sm text-slate-400 mb-1">LED</p>
            {realtimeState?.led ? (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {realtimeState.led.on ? 'ON' : 'OFF'}
                </span>
                <span className="text-sm text-slate-400">
                  Pin: {realtimeState.led.pin}
                </span>
              </div>
            ) : (
              <span className="text-lg text-slate-500">—</span>
            )}
            <p className="text-sm text-slate-400 mt-3 mb-1">Light sensor</p>
            <span className="text-lg text-white">
              {realtimeState?.light === 'on'
                ? 'Detected'
                : realtimeState?.light === 'off'
                  ? 'Off'
                  : '—'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRealtimeCommand('on')}
              disabled={!realtimeConnected}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              On
            </button>
            <button
              onClick={() => handleRealtimeCommand('off')}
              disabled={!realtimeConnected}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Off
            </button>
            <button
              onClick={() => handleRealtimeCommand('toggle')}
              disabled={!realtimeConnected}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
