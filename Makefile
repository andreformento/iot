.PHONY: install api-start web-start setup-env agent-start agent-log mqtt test clean kill

install:
	cd iot-api && npm install
	cd iot-web && npm install

api-start:
	cd iot-api && (test -f .env || cp .env.local .env) && npm run start:dev

web-start:
	cd iot-web && (test -f .env || cp .env.local .env) && npm run dev

PORT ?= /dev/ttyACM0

agent-setup:
	@test -n "$(WIFI_SSID)" || (echo "ERROR: WIFI_SSID required" && exit 1)
	@test -n "$(WIFI_PASS)" || (echo "ERROR: WIFI_PASS required" && exit 1)
	@rm -f iot-agent/.env && \
	MQTT_BROKER=$$(powershell.exe -ExecutionPolicy Bypass -File get-mqtt-broker-ip.ps1 2>/dev/null | tr -d '\r' | sed 's/^MQTT_BROKER=//' | tr -d '\n'); \
	echo "WIFI_SSID=\"$(WIFI_SSID)\"" >> iot-agent/.env; \
	echo "WIFI_PASS=\"$(WIFI_PASS)\"" >> iot-agent/.env; \
	echo "MQTT_BROKER=$$MQTT_BROKER" >> iot-agent/.env

agent-start:
	@cd iot-agent && [ -f .env ] && set -a && . ./.env && set +a; \
	test -n "$$WIFI_SSID" || { echo "ERROR: WIFI_SSID required"; exit 1; }; \
	test -n "$$WIFI_PASS" || { echo "ERROR: WIFI_PASS required"; exit 1; }; \
	test -n "$$MQTT_BROKER" || { echo "ERROR: MQTT_BROKER required"; exit 1; }; \
	pio run && pio run -t upload --upload-port $(PORT) && cd .. && $(MAKE) agent-log

agent-log:
	cd iot-agent && pio device monitor --port $(PORT) --baud 115200

mqtt:
	docker compose up -d

test:
	@cd iot-api && npm test && npm run test:e2e

kill:
	@lsof -ti:3000,3001 | xargs kill -9

clean:
	cd iot-api && rm -rf dist node_modules .env
	cd iot-web && rm -rf .next out node_modules .env
