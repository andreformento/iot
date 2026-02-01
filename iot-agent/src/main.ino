/* IoT Agent - ESP32 */

#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <WiFiClient.h>

#ifndef WIFI_SSID
#error "WIFI_SSID not defined (set env var WIFI_SSID)"
#endif
#ifndef WIFI_PASS
#error "WIFI_PASS not defined (set env var WIFI_PASS)"
#endif

static_assert(sizeof(WIFI_SSID) > 1, "WIFI_SSID is empty (set env var WIFI_SSID)");
static_assert(sizeof(WIFI_PASS) > 1, "WIFI_PASS is empty (set env var WIFI_PASS)");

#ifndef MQTT_BROKER
#error "MQTT_BROKER not defined (set env var MQTT_BROKER)"
#endif
static_assert(sizeof(MQTT_BROKER) > 1, "MQTT_BROKER is empty (set env var MQTT_BROKER)");

static const int LED_PIN = 4;
static const int PHOTO_PIN = 34;
static const int LIGHT_THRESHOLD = 1000;

static bool ledState = false;
static bool lastLightState = false;

WebServer server(80);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

/* Device-scoped MQTT topics: device/<IP>/... (filled in setup after WiFi) */
static char MQTT_STATE_TOPIC[48];
static char MQTT_COMMAND_TOPIC[48];
static char MQTT_LIGHT_TOPIC[48];
static char MQTT_STATUS_TOPIC[48];

static void publishState() {
  if (!mqttClient.connected()) return;
  char buf[64];
  snprintf(buf, sizeof(buf), "{\"on\":%s,\"pin\":%d}", ledState ? "true" : "false", LED_PIN);
  mqttClient.publish(MQTT_STATE_TOPIC, buf);
}

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_COMMAND_TOPIC) != 0) return;
  if (length == 6 && memcmp(payload, "toggle", 6) == 0) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  } else if (length == 2 && memcmp(payload, "on", 2) == 0) {
    ledState = true;
    digitalWrite(LED_PIN, HIGH);
  } else if (length == 3 && memcmp(payload, "off", 3) == 0) {
    ledState = false;
    digitalWrite(LED_PIN, LOW);
  }
  publishState();
}

static void handleState() {
  String json = String("{\"on\":") + (ledState ? "true" : "false") + ",\"pin\":" + LED_PIN + "}";
  server.send(200, "application/json", json);
}

static void handleToggle() {
  ledState = !ledState;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  publishState();
  String json = String("{\"on\":") + (ledState ? "true" : "false") + ",\"action\":\"toggled\"}";
  server.send(200, "application/json", json);
}

static void handleOn() {
  ledState = true;
  digitalWrite(LED_PIN, HIGH);
  publishState();
  String json = "{\"on\":true,\"action\":\"turned_on\"}";
  server.send(200, "application/json", json);
}

static void handleOff() {
  ledState = false;
  digitalWrite(LED_PIN, LOW);
  publishState();
  String json = "{\"on\":false,\"action\":\"turned_off\"}";
  server.send(200, "application/json", json);
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  delay(200);

  analogSetPinAttenuation(PHOTO_PIN, ADC_11db);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Wi-Fi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/state", HTTP_GET, handleState);
  server.on("/toggle", HTTP_POST, handleToggle);
  server.on("/on", HTTP_POST, handleOn);
  server.on("/off", HTTP_POST, handleOff);
  server.begin();
  Serial.println("IoT Agent started - REST API on port 80.");

  IPAddress addr = WiFi.localIP();
  char ip[16];
  snprintf(ip, sizeof(ip), "%d.%d.%d.%d", addr[0], addr[1], addr[2], addr[3]);
  snprintf(MQTT_STATE_TOPIC, sizeof(MQTT_STATE_TOPIC), "device/%s/led/state", ip);
  snprintf(MQTT_COMMAND_TOPIC, sizeof(MQTT_COMMAND_TOPIC), "device/%s/led/command", ip);
  snprintf(MQTT_LIGHT_TOPIC, sizeof(MQTT_LIGHT_TOPIC), "device/%s/light/state", ip);
  snprintf(MQTT_STATUS_TOPIC, sizeof(MQTT_STATUS_TOPIC), "device/%s/status", ip);

  Serial.print("MQTT broker: ");
  Serial.println(MQTT_BROKER);
  mqttClient.setServer(MQTT_BROKER, 1883);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  if (!mqttClient.connected()) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect > 1000) {
      lastReconnect = now;
      if (mqttClient.connect("esp32", MQTT_STATUS_TOPIC, 0, true, "offline")) {
        mqttClient.subscribe(MQTT_COMMAND_TOPIC);
        publishState();
        Serial.println("MQTT connected!");
      } else {
        Serial.print("MQTT connect failed broker=");
        Serial.print(MQTT_BROKER);
        Serial.print(":1883 state=");
        Serial.print(mqttClient.state());
        Serial.println(" (retry in 1s)");
      }
    }
  } else {
    mqttClient.loop();
  }

  static unsigned long lastCheck = 0;

  if (now - lastCheck > 100) {
    int lightValue = analogRead(PHOTO_PIN);
    bool hasLight = lightValue < LIGHT_THRESHOLD;

    if (hasLight != lastLightState) {
      lastLightState = hasLight;

      if (hasLight) {
        Serial.println("Light detected!");
      } else {
        Serial.println("Light turned off");
      }

      if (mqttClient.connected()) {
        mqttClient.publish(MQTT_LIGHT_TOPIC, hasLight ? "on" : "off");
      }
    }

    lastCheck = now;
  }
}
