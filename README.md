# IoT System

Real-time bidirectional communication between ESP32 devices and web/mobile clients.

## Architecture

```
ESP32 (iot-agent) → MQTT → NestJS (iot-api) → Socket.IO → Web/Mobile (iot-web)
```

**Data Flow:**
- Device → Cloud: ESP32 publishes sensor data via MQTT → API receives and broadcasts via Socket.IO
- Cloud → Device: Web sends commands via Socket.IO → API publishes to MQTT → ESP32 receives

## Quick Start

### iot

Prepare
```bash
pipx install platformio || pip install platformio
```

IoT
```bash
pio run                  # Build
pio run --target upload  # Upload to device
pio device monitor       # Serial monitor
```

### back

```bash
make install      # Install dependencies
./setup-mosquitto.sh  # Start MQTT broker
make iot-api      # Start API (terminal 1)
make iot-web      # Start web (terminal 2)
```

Configure ESP32: `cd iot-agent`, copy `secrets.h.example` and `mqtt_config.h.example`, then upload via Arduino IDE.

Open http://localhost:3000

## Project Structure

```
iot-agent/    ESP32 firmware (Arduino C++)
iot-api/      NestJS backend (MQTT + Socket.IO)
iot-web/      Next.js frontend
```

## Hardware

- ESP32 board
- LED on GPIO 4
- Photoresistor on GPIO 34

## Make Commands

```bash
make install    # Install dependencies
make mqtt       # Start MQTT broker
make iot-api    # Start API (port 3001)
make iot-web    # Start web (port 3000)
make clean      # Clean all
```

## PlatformIO

- [PlatformIO WSL 2 Setup Guide](https://jujaroen.com/posts/post-6/)
  - windows:
    - `wsl --update`
    - `winget install --interactive --exact dorssel.usbipd-win`
    - `usbipd list`
    - `usbipd attach --wsl --busid 1-3`
  - linux:
    - `sudo apt-get install -y usbutils`
    - `lsusb`
