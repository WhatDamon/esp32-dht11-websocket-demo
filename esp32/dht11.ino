#include <WiFi.h>
#include <WebSocketsServer.h>
#include "DHTesp.h"
#include <ArduinoJson.h>

const char* ssid = "ssidName"; // 替换为网络SSID
const char* password = "wifiPassword"; // 替换为网络明文密码
const int DHT_PIN = 4; // DHT11
const int buttonPin = 2; // 按钮管理
const int ledPin = 13; // LED输出

DHTesp dhtSensor;
WebSocketsServer webSocket = WebSocketsServer(81);
volatile bool buttonState = false;

void buttonCheckTask(void* params) {
  bool lastButtonState = digitalRead(buttonPin);

  // 按钮状态转换
  for (;;) {
    bool currentButtonState = digitalRead(buttonPin);

    if (lastButtonState == LOW && currentButtonState == HIGH) {
      buttonState = !buttonState;
    }

    lastButtonState = currentButtonState;
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
    // 断开连接
      Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      {
        // 获取连接
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);

        // 构建JSON对象
        StaticJsonDocument<200> doc;
        doc["button"] = buttonState ? "ON" : "OFF";

        // 将JSON对象转换为字符串
        char buffer[200];
        serializeJson(doc, buffer);
        webSocket.broadcastTXT(buffer);
      }
      break;
    case WStype_TEXT:
      break;
  }
}

void setup() {
  // 初始化
  Serial.begin(115200);
  dhtSensor.setup(DHT_PIN, DHTesp::DHT11);
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("."); // 如果没有成功连接则移植显示点并反复尝试连接
  }
  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  webSocket.begin(); // 启用WebSocket
  webSocket.onEvent(webSocketEvent);
  xTaskCreate(
    buttonCheckTask,
    "ButtonCheckTask",
    2048,
    NULL,
    1,
    NULL); // 创建新线程
}

void loop() {
  static unsigned long lastTime = 0;
  if (millis() - lastTime >= 1000) {
    lastTime = millis();
    TempAndHumidity data = dhtSensor.getTempAndHumidity();
    
    // 构建JSON对象
    StaticJsonDocument<200> doc;
    doc["temperature"] = data.temperature;
    doc["humidity"] = data.humidity;
    doc["button"] = buttonState ? "ON" : "OFF";

    // 将JSON对象转换为字符串
    char buffer[200];
    serializeJson(doc, buffer);
    webSocket.broadcastTXT(buffer);

    // 串口输出
    Serial.println("Temp: " + String(data.temperature, 2) + "°C");
    Serial.println("Humidity: " + String(data.humidity, 1) + "%");
    digitalWrite(ledPin, data.temperature >= 30.0 && buttonState ? HIGH : LOW);
    Serial.println("---");
  }
  webSocket.loop();
}