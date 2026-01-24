#!/bin/bash
set -e

echo "Setting up Mosquitto MQTT broker..."

docker-compose up -d mosquitto

# Wait for Mosquitto to be ready (max 1s)
for i in {1..30}; do
  if docker exec iot-mosquitto mosquitto -h >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

docker exec iot-mosquitto mosquitto_passwd -c -b /mosquitto/config/passwd api-user iot-api-2024
docker exec iot-mosquitto mosquitto_passwd -b /mosquitto/config/passwd esp32-device-001 device-secret-001

docker-compose restart mosquitto

echo ""
echo "[OK] Mosquitto ready on localhost:1883"
echo "  API: api-user / iot-api-2024"
echo "  Device: esp32-device-001 / device-secret-001"
