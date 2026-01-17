

/*
  ESP32 REST API - LED Control (GPIO 4)
  Wi-Fi credentials are stored in secrets.h (not versioned)
*/

#include <WiFi.h>
#include <WebServer.h>
#include "secrets.h"

static const int LED_PIN = 4;
static const int PHOTO_PIN = 34;  // ADC pin for photoresistor
static const int LIGHT_THRESHOLD = 2000;  // Adjust based on your sensor

static bool ledState = false;
static bool lastLightState = false;  // Track light presence

WebServer server(80);

static String htmlPage() {
  String stateText = ledState ? "ON" : "OFF";
  String buttonText = ledState ? "Turn Off" : "Turn On";

  return R"=====(<!doctype html><html lang='en'><head>
<meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>ESP32 LED</title>
<style>
body{font-family:Arial,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b1220;color:#e6eefc}
.card{background:#121a2b;border:1px solid #22304d;border-radius:16px;padding:22px;max-width:420px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.35)}
h1{font-size:20px;margin:0 0 10px}
.state{font-size:16px;margin:10px 0 18px}
.btn{padding:12px 16px;border-radius:12px;background:#2b6cff;color:#fff;border:0;font-weight:700;cursor:pointer}
.btn:active{transform:scale(.99)}
.hint{opacity:.8;font-size:12px;margin-top:14px}
</style></head><body><div class='card'>
<h1>LED Control (GPIO 4)</h1>
<div id='state' class='state'>Current State: <b>)=====" + stateText + R"=====(</b></div>
<button id='btn' class='btn'>)=====" + buttonText + R"=====(</button>
<div class='hint'>Toggle uses POST (prevents accidental triggering by prefetch).</div>
<script>
async function refresh(){const r=await fetch('/state');const j=await r.json();
document.querySelector('#state').innerHTML='Current State: <b>'+(j.on?'ON':'OFF')+'</b>';
document.querySelector('#btn').textContent=j.on?'Turn Off':'Turn On';}
document.querySelector('#btn').addEventListener('click',async()=>{await fetch('/toggle',{method:'POST'});await refresh();});
refresh();
</script></div></body></html>)=====";
}

static void handleRoot() {
  server.send(200, "text/html; charset=utf-8", htmlPage());
}

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

  server.on("/", HTTP_GET, handleRoot);
  server.on("/state", HTTP_GET, handleState);
  server.on("/toggle", HTTP_POST, handleToggle);
  server.on("/on", HTTP_POST, handleOn);
  server.on("/off", HTTP_POST, handleOff);
  server.begin();
  Serial.println("Server started - Web Interface + REST API on port 80.");
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
