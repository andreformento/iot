/*
  IoT Agent - ESP32 Edge Device

  Pure REST API for environmental monitoring and actuator control.
  - LED control (GPIO 4)
  - Light sensor monitoring (GPIO 34)
  - REST API endpoints

  Wi-Fi credentials are stored in secrets.h (not versioned)
*/

#include <WiFi.h>
#include <WebServer.h>

// Wi-Fi credentials are injected via PlatformIO build flags.
// See `platformio.ini` (WIFI_SSID / WIFI_PASS).
#ifndef WIFI_SSID
#error "WIFI_SSID not defined (set env var WIFI_SSID)"
#endif
#ifndef WIFI_PASS
#error "WIFI_PASS not defined (set env var WIFI_PASS)"
#endif

static_assert(sizeof(WIFI_SSID) > 1, "WIFI_SSID is empty (set env var WIFI_SSID)");
static_assert(sizeof(WIFI_PASS) > 1, "WIFI_PASS is empty (set env var WIFI_PASS)");

static const int LED_PIN = 4;
static const int PHOTO_PIN = 34;  // ADC pin for photoresistor
static const int LIGHT_THRESHOLD = 2000;  // Adjust based on your sensor

static bool ledState = false;
static bool lastLightState = false;  // Track light presence

WebServer server(80);

static void handleState() {
  String json = String("{\"on\":") + (ledState ? "true" : "false") + ",\"pin\":" + LED_PIN + "}";
  server.send(200, "application/json", json);
}

static void handleToggle() {
  ledState = !ledState;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  String json = String("{\"on\":") + (ledState ? "true" : "false") + ",\"action\":\"toggled\"}";
  server.send(200, "application/json", json);
}

static void handleOn() {
  ledState = true;
  digitalWrite(LED_PIN, HIGH);
  String json = "{\"on\":true,\"action\":\"turned_on\"}";
  server.send(200, "application/json", json);
}

static void handleOff() {
  ledState = false;
  digitalWrite(LED_PIN, LOW);
  String json = "{\"on\":false,\"action\":\"turned_off\"}";
  server.send(200, "application/json", json);
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  delay(200);

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
}

void loop() {
  server.handleClient();

  static unsigned long lastCheck = 0;
  unsigned long now = millis();

  // Check for light state changes every 100ms
  if (now - lastCheck > 100) {
    int lightValue = analogRead(PHOTO_PIN);
    bool hasLight = lightValue < LIGHT_THRESHOLD;  // Inverted logic for voltage divider

    if (hasLight != lastLightState) {
      lastLightState = hasLight;

      if (hasLight) {
        Serial.println("Light detected!");
      } else {
        Serial.println("Light turned off");
      }
    }

    lastCheck = now;
  }
}
