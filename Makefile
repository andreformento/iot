.PHONY: install api-start web-start agent-start agent-log test clean kill

install:
	cd iot-api && npm install
	cd iot-web && npm install

api-start:
	cd iot-api && (test -f .env || cp .env.local .env) && npm run start:dev

web-start:
	cd iot-web && (test -f .env || cp .env.local .env) && npm run dev

PORT ?= /dev/ttyACM0
export WIFI_SSID WIFI_PASS

agent-start:
	@test -c "$(PORT)" || (echo "ERROR: $(PORT) not found. Run: pio device list" && exit 1)
	@test -n "$(WIFI_SSID)" || (echo "ERROR: WIFI_SSID env var is required" && exit 1)
	@test -n "$(WIFI_PASS)" || (echo "ERROR: WIFI_PASS env var is required" && exit 1)
	cd iot-agent && WIFI_SSID="$(WIFI_SSID)" WIFI_PASS="$(WIFI_PASS)" pio run
	cd iot-agent && WIFI_SSID="$(WIFI_SSID)" WIFI_PASS="$(WIFI_PASS)" pio run -t upload --upload-port $(PORT)

agent-log:
	cd iot-agent && pio device monitor --port $(PORT) --baud 115200

test:
	@cd iot-api && npm test && npm run test:e2e

kill:
	@lsof -ti:3000,3001 | xargs kill -9

clean:
	cd iot-api && rm -rf dist node_modules .env
	cd iot-web && rm -rf .next out node_modules .env
