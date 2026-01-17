# IoT System

ESP32 edge devices with NestJS API gateway.

## Architecture

```
Browser → API Server (NestJS) → IoT Agent (ESP32)
          Port 3000               Port 80
          Web UI + REST           Pure REST
```

## Components

**iot-api/** - NestJS API server with web interface
**iot-agent/** - ESP32 firmware (LED + light sensor)

## Quick Start

### ESP32 Setup

```bash
cd iot-agent
cp secrets.h.example secrets.h
# Edit secrets.h with WiFi credentials
# Upload via Arduino IDE
```

### Start API

```bash
make install
make dev
```

Open `http://localhost:3000`, enter ESP32 IP, control LED.

## Commands

```bash
make help         # Show all commands
make install      # Install dependencies
make dev          # Start dev server
make build        # Build for production
make test         # Run tests
make test-all     # Run all tests
make clean        # Clean artifacts
```

## API Endpoints

### GET /health
Health check.

```bash
curl "http://localhost:3000/health"
```

### GET /devices/:ip/state
Get LED state.

```bash
curl "http://localhost:3000/devices/192.168.0.15/state"
```

Response: `{"on":false,"pin":4}`

### POST /devices/:ip/toggle
Toggle LED.

```bash
curl -X POST "http://localhost:3000/devices/192.168.0.15/toggle"
```

### POST /devices/:ip/on
Turn LED on.

```bash
curl -X POST "http://localhost:3000/devices/192.168.0.15/on"
```

### POST /devices/:ip/off
Turn LED off.

```bash
curl -X POST "http://localhost:3000/devices/192.168.0.15/off"
```

## Hardware

**LED:** GPIO 4
**Photoresistor:** GPIO 34 (ADC)
**Wiring:** `3.3V → 10kΩ → GPIO34 → Photoresistor → GND`
