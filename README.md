# IoT Agent

Edge device agent for ESP32 that monitors environmental sensors and provides REST API control. Collects data from the environment and communicates with cloud services.

## Setup

1. Copy `iot-agent/secrets.h.example` to `iot-agent/secrets.h`
2. Configure your WiFi credentials in `secrets.h`
3. Upload the code to the ESP32
4. Note the IP displayed in the Serial Monitor

## Web Interface

Access via browser:

```
http://192.168.1.100/
```

You will see a visual interface to control the LED.

## API Endpoints

Set your ESP32 IP:

```bash
export ESP32_IP=192.168.1.100
```

### GET /state
Returns the current LED state.

```bash
curl --max-time 2 "http://$ESP32_IP/state"
```

Response:
```json
{"on":false,"pin":4}
```

### POST /toggle
Toggles the LED state (on/off).

```bash
curl --max-time 2 -X POST "http://$ESP32_IP/toggle"
```

Response:
```json
{"on":true,"action":"toggled"}
```

### POST /on
Turns the LED on.

```bash
curl --max-time 2 -X POST "http://$ESP32_IP/on"
```

Response:
```json
{"on":true,"action":"turned_on"}
```

### POST /off
Turns the LED off.

```bash
curl --max-time 2 -X POST "http://$ESP32_IP/off"
```

Response:
```json
{"on":false,"action":"turned_off"}
```

## Hardware

- **LED Pin:** GPIO 4
- **Photoresistor Pin:** GPIO 34 (ADC)
- **Port:** 80

### Photoresistor Wiring

Connect your photoresistor in a voltage divider configuration:

```
3.3V ----[ 10kΩ Resistor ]---- GPIO 34 ----[ Photoresistor ]---- GND
```

**Note:** GPIO 34 is used because it's an ADC-capable pin on ESP32. Adjust `LIGHT_THRESHOLD` constant in the code (default 2000) based on your sensor readings shown in Serial Monitor.
