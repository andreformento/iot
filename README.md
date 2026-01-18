# IoT System

ESP32 edge devices with Next.js frontend and NestJS API.

## Architecture

```
iot-web (Frontend)  →  iot-api (Backend)  →  iot-agent (Device)
Port 3000               Port 3001              Port 80
Next.js                 NestJS                 ESP32
```

## Quick Start

### ESP32 Setup

```bash
cd iot-agent
cp secrets.h.example secrets.h
# Edit secrets.h with WiFi credentials
# Upload via Arduino IDE
```

### Environment Configuration

Both TypeScript projects follow the same pattern:

**iot-api/.env.local** (versioned)
```env
PORT=3001
```

**iot-web/.env.local** (versioned)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3000
```

**Strategy:**
- `.env.local` files are versioned in git
- Makefile automatically copies `.env.local` to `.env` if `.env` doesn't exist
- `.env` files are gitignored (local runtime only)
- Both projects use `dotenv` package to load `.env` files

**Implementation:**
- `iot-api`: `import 'dotenv/config'` in `main.ts`
- `iot-web`: Next.js loads `.env` automatically

### Start Application

**Terminal 1:**
```bash
make iot-api
```
Starts API on `http://localhost:3001`

**Terminal 2:**
```bash
make iot-web
```
Starts frontend on `http://localhost:3000`

Visit: `http://localhost:3000`

## Commands

Both projects follow the same patterns:

**Install dependencies:**
```bash
make install
```
Runs `npm install` in both `iot-api/` and `iot-web/`

**Start services (separate terminals):**
```bash
make iot-api    # Terminal 1: Starts NestJS on port 3001
make iot-web    # Terminal 2: Starts Next.js on port 3000
```

**Run tests:**
```bash
make test       # Runs iot-api unit + e2e tests
```

**Kill running services:**
```bash
make kill       # Kills processes on ports 3000/3001
```

**Clean build artifacts:**
```bash
make clean      # Removes node_modules, dist, .next, out
```

## API Endpoints

### GET /health
Health check.

```bash
curl "http://localhost:3001/health"
```

### GET /devices/:ip/state
Get LED state.

```bash
curl "http://localhost:3001/devices/192.168.0.15/state"
```

Response: `{"on":false,"pin":4}`

### POST /devices/:ip/toggle
Toggle LED.

```bash
curl -X POST "http://localhost:3001/devices/192.168.0.15/toggle"
```

### POST /devices/:ip/on
Turn LED on.

```bash
curl -X POST "http://localhost:3001/devices/192.168.0.15/on"
```

### POST /devices/:ip/off
Turn LED off.

```bash
curl -X POST "http://localhost:3001/devices/192.168.0.15/off"
```

## Hardware

**LED:** GPIO 4
**Photoresistor:** GPIO 34 (ADC)
**Wiring:** `3.3V → 10kΩ → GPIO34 → Photoresistor → GND`

## Tech Stack

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS
**Backend:** NestJS, TypeScript, Axios
**Device:** ESP32, Arduino, C++
