'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface RealtimeState {
  led: { on: boolean; pin: number } | null;
  light: 'on' | 'off' | null;
}

/** State keyed by device IP (from MQTT topics device/<IP>/...) */
export type DevicesState = Record<string, RealtimeState>;

/** Payload emitted by API on 'state' (includes server timestamp for alerts) */
export interface StatePayload {
  devices: DevicesState;
  timestamp: number;
}

export function createRealtimeSocket(): Socket {
  return io(API_URL, {
    path: '/realtime',
    autoConnect: true,
  });
}
