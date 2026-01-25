/*
  IoT Agent - ESP32 Edge Device (Cloud-Connected)

  Secure MQTT + REST API for environmental monitoring and actuator control.
  - LED control (GPIO 4)
  - Light sensor monitoring (GPIO 34)
  - MQTT for cloud communication (secure TLS)
  - REST API for local access and health checks

  Configuration files (not versioned):
  - secrets.h: Wi-Fi credentials
  - mqtt_config.h: MQTT broker settings and device token
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "secrets.h"
#include "mqtt_config.h"

// ESP32 built-in certificate bundle (includes common root CAs like Let's Encrypt)
#if USE_TLS
  extern const uint8_t rootca_crt_bundle_start[] asm("_binary_data_cert_x509_crt_bundle_bin_start");
#endif

// Hardware pins
static const int LED_PIN = 4;
static const int PHOTO_PIN = 34;
static const int LIGHT_THRESHOLD = 2000;

// State
static bool ledState = false;
static bool lastLightState = false;
static unsigned long lastReconnectAttempt = 0;
static unsigned long lastHealthBroadcast = 0;

// Clients
#if USE_TLS
  WiFiClientSecure secureClient;
  PubSubClient mqttClient(secureClient);
#else
  WiFiClient wifiClient;
  PubSubClient mqttClient(wifiClient);
#endif
WebServer server(80);

// =============================================================================
// MQTT Functions
// =============================================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT message received on topic: ");
  Serial.println(topic);

  // Parse JSON command
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Handle commands
  const char* cmd = doc["command"];
  if (cmd == nullptr) {
    Serial.println("No 'command' field in message");
    return;
  }

  if (strcmp(cmd, "LED_ON") == 0) {
    ledState = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("Command executed: LED ON");
  }
  else if (strcmp(cmd, "LED_OFF") == 0) {
    ledState = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("Command executed: LED OFF");
  }
  else if (strcmp(cmd, "LED_TOGGLE") == 0) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    Serial.println("Command executed: LED TOGGLE");
  }
  else {
    Serial.print("Unknown command: ");
    Serial.println(cmd);
  }

  // Send acknowledgment
  publishLedState();
}

bool connectMQTT() {
  Serial.print("Connecting to MQTT broker: ");
  Serial.println(MQTT_SERVER);

  // Attempt to connect with credentials
  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println("[OK] MQTT connected!");

    // Subscribe to command topic
    mqttClient.subscribe(TOPIC_COMMANDS);
    Serial.print("[OK] Subscribed to: ");
    Serial.println(TOPIC_COMMANDS);

    // Publish online status
    publishStatus("online");
    publishLedState();

    return true;
  } else {
    Serial.print("[ERROR] MQTT connection failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" (will retry)");
    return false;
  }
}

void publishStatus(const char* status) {
  StaticJsonDocument<128> doc;
  doc["status"] = status;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  char buffer[128];
  serializeJson(doc, buffer);

  mqttClient.publish(TOPIC_STATUS, buffer, true);  // Retained message
}

void publishLedState() {
  StaticJsonDocument<128> doc;
  doc["sensor"] = "led";
  doc["state"] = ledState ? "on" : "off";
  doc["pin"] = LED_PIN;
  doc["timestamp"] = millis();

  char buffer[128];
  serializeJson(doc, buffer);

  mqttClient.publish(TOPIC_SENSORS_LIGHT, buffer);
}

void publishLightSensor(bool hasLight) {
  StaticJsonDocument<128> doc;
  doc["sensor"] = "light";
  doc["detected"] = hasLight;
  doc["timestamp"] = millis();

  char buffer[128];
  serializeJson(doc, buffer);

  mqttClient.publish(TOPIC_SENSORS_LIGHT, buffer);

  Serial.print("[MQTT] Published light sensor: ");
  Serial.println(hasLight ? "detected" : "off");
}

// =============================================================================
// HTTP API Functions (for local access and health checks)
// =============================================================================

void handleHealth() {
  StaticJsonDocument<256> doc;
  doc["status"] = "ok";
  doc["mqtt_connected"] = mqttClient.connected();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime_ms"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);

  server.send(200, "application/json", buffer);
}

void handleState() {
  StaticJsonDocument<128> doc;
  doc["on"] = ledState;
  doc["pin"] = LED_PIN;

  char buffer[128];
  serializeJson(doc, buffer);

  server.send(200, "application/json", buffer);
}

void handleToggle() {
  ledState = !ledState;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  publishLedState();
  handleState();
}

void handleOn() {
  ledState = true;
  digitalWrite(LED_PIN, HIGH);
  publishLedState();
  handleState();
}

void handleOff() {
  ledState = false;
  digitalWrite(LED_PIN, LOW);
  publishLedState();
  handleState();
}

// =============================================================================
// Setup
// =============================================================================

void setup() {
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  delay(200);
  Serial.println("\n\n=================================");
  Serial.println("IoT Agent - ESP32");
  Serial.println("=================================");

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("[OK] Wi-Fi connected!");
  Serial.print("  IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("  Signal: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // Configure MQTT client
  #if USE_TLS
    secureClient.setCACertBundle(rootca_crt_bundle_start);  // Use ESP32 built-in certificate bundle
    Serial.println("\n[OK] MQTT client configured with TLS");
    Serial.println("  TLS: Enabled (ESP32 certificate bundle)");
  #else
    Serial.println("\n[OK] MQTT client configured (plain)");
    Serial.println("  TLS: Disabled (local development)");
  #endif

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);

  Serial.print("  Server: ");
  Serial.println(MQTT_SERVER);
  Serial.print("  Port: ");
  Serial.println(MQTT_PORT);

  // Initial MQTT connection
  connectMQTT();

  // Start HTTP server for local access
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/state", HTTP_GET, handleState);
  server.on("/toggle", HTTP_POST, handleToggle);
  server.on("/on", HTTP_POST, handleOn);
  server.on("/off", HTTP_POST, handleOff);
  server.begin();

  Serial.println("[OK] HTTP server started on port 80");
  Serial.println("\n=================================");
  Serial.println("System ready!");
  Serial.println("=================================\n");
}

// =============================================================================
// Main Loop
// =============================================================================

void loop() {
  // Handle MQTT connection and messages
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    // Exponential backoff: 5s, 10s, 20s, max 60s
    static int reconnectDelay = 5000;

    if (now - lastReconnectAttempt > reconnectDelay) {
      lastReconnectAttempt = now;
      Serial.println("[WARN] MQTT disconnected. Reconnecting...");

      if (connectMQTT()) {
        reconnectDelay = 5000;  // Reset on success
      } else {
        reconnectDelay = min(reconnectDelay * 2, 60000);  // Double delay, max 60s
      }
    }
  } else {
    mqttClient.loop();  // Process MQTT messages
  }

  // Handle HTTP requests
  server.handleClient();

  // Check light sensor for changes
  static unsigned long lastSensorCheck = 0;
  unsigned long now = millis();

  if (now - lastSensorCheck > 100) {  // Check every 100ms
    int lightValue = analogRead(PHOTO_PIN);
    bool hasLight = lightValue < LIGHT_THRESHOLD;

    if (hasLight != lastLightState) {
      lastLightState = hasLight;

      // Log to serial
      if (hasLight) {
        Serial.println("[SENSOR] Light detected!");
      } else {
        Serial.println("[SENSOR] Light turned off");
      }

      // Publish to cloud via MQTT
      if (mqttClient.connected()) {
        publishLightSensor(hasLight);
      }
    }

    lastSensorCheck = now;
  }

  // Periodic health broadcast (every 5 minutes)
  if (now - lastHealthBroadcast > 300000) {
    if (mqttClient.connected()) {
      publishStatus("online");
      Serial.println("[MQTT] Health broadcast sent");
    }
    lastHealthBroadcast = now;
  }
}
