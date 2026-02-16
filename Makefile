.PHONY: install api-start web-start agent-setup agent-start agent-log agent-ports mqtt test kill clean

install:
	cd iot-api && npm install
	cd iot-web && npm install

api-start:
	cd iot-api && (test -f .env || cp .env.local .env) && npm run start:dev

web-start:
	cd iot-web && (test -f .env || cp .env.local .env) && npm run dev

agent-setup:
	@bash scripts/agent-setup.sh "$(WIFI_SSID)" "$(WIFI_PASS)" "$(PORT)"

# Precedence: make args override .env (source .env then override if VAR is set)
agent-start:
	@cd iot-agent && set -a && [ -f .env ] && . ./.env && set +a && \
	[ -n "$(WIFI_SSID)" ] && export WIFI_SSID="$(WIFI_SSID)"; \
	[ -n "$(WIFI_PASS)" ] && export WIFI_PASS="$(WIFI_PASS)"; \
	[ -n "$(MQTT_BROKER)" ] && export MQTT_BROKER="$(MQTT_BROKER)"; \
	[ -n "$(PORT)" ] && export PORT="$(PORT)"; \
	test -n "$$WIFI_SSID" || { echo "ERROR: WIFI_SSID required"; exit 1; }; \
	test -n "$$MQTT_BROKER" || { echo "ERROR: MQTT_BROKER required"; exit 1; }; \
	test -n "$$PORT" || { echo "ERROR: PORT required (run make agent-setup)"; exit 1; }; \
	pio run && pio run -t upload --upload-port "$$PORT" && cd .. && $(MAKE) agent-log

agent-log:
	@cd iot-agent && set -a && [ -f .env ] && . ./.env && set +a && \
	[ -n "$(PORT)" ] && export PORT="$(PORT)"; \
	pio device monitor --port "$${PORT}" --baud 115200

agent-ports:
	@ls /dev/tty* 2>/dev/null | grep -E 'USB|ACM' || echo "No serial ports (USB/ACM) found."

mqtt:
	docker compose up -d

test:
	@cd iot-api && npm test && npm run test:e2e

kill:
	@lsof -ti:3000,3001 2>/dev/null | xargs kill -9 2>/dev/null || true

clean:
	cd iot-api && rm -rf dist node_modules .env
	cd iot-web && rm -rf .next out node_modules .env
