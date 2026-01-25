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
cp include/secrets.h.example include/secrets.h
# Edit include/secrets.h with WiFi credentials

# Build + upload via PlatformIO (WSL/Ubuntu)
pio run -t upload --upload-port /dev/ttyACM0

# Optional: serial monitor
pio device monitor --port /dev/ttyACM0 --baud 115200
```

### Start Application

**Terminal 1:**
```bash
make api-start
```
Starts API on `http://localhost:3001`

**Terminal 2:**
```bash
make web-start
```
Starts frontend on `http://localhost:3000`


## Commands

Both projects follow the same patterns:

**Install dependencies:**
```bash
make install
```

**Start services (separate terminals):**
```bash
make api-start  # Terminal 1: Starts NestJS on port 3001
make web-start  # Terminal 2: Starts Next.js on port 3000
```

**Run tests:**
```bash
make test       # Runs iot-api unit + e2e tests
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

## PlatformIO

- [PlatformIO WSL 2 Setup Guide](https://jujaroen.com/posts/post-6/)
  - windows:
    - `wsl --update`
    - `winget install --interactive --exact dorssel.usbipd-win`
    - `usbipd list`
    - `usbipd attach --wsl --busid <BUSID>`
  - linux:
    - `sudo apt-get install -y usbutils`
    - `lsusb`

**WSL/Ubuntu CLI workflow:**
```bash
# If upload fails with "Permission denied", then:
sudo usermod -aG dialout $USER
# Restart WSL: `wsl --shutdown` (Windows), then try upload again
```

**Makefile shortcuts:**
```bash
make agent-start  # build + upload (checks /dev/ttyACM0 exists)
make agent-log    # serial monitor
```
