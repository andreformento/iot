.PHONY: install mqtt mqtt-logs mqtt-stop iot-api iot-web test clean kill agent-build agent-logs

install:
	cd iot-api && npm install
	cd iot-web && npm install

mqtt:
	docker-compose up -d

mqtt-logs:
	docker-compose logs -f mosquitto

mqtt-stop:
	docker-compose stop

iot-api:
	cd iot-api && test -f .env || cp .env.local .env && npm run start:dev

iot-web:
	cd iot-web && test -f .env || cp .env.local .env && npm run dev

test:
	@cd iot-api && npm test && npm run test:e2e

kill:
	@lsof -ti:3000,3001 | xargs kill -9

clean:
	cd iot-api && rm -rf dist node_modules .env
	cd iot-web && rm -rf .next out node_modules .env

agent-build:
	cd iot-agent && pio run -e esp32dev-notls --target upload

agent-logs:
	cd iot-agent && pio device monitor
