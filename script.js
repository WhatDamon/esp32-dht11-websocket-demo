var ws;
var reconnectInterval = 5000; // 5 秒重连
var temperatureData = [];
var humidityData = [];
var thiData = [];
var timeData = [];
var chart;
var hasError = false;
var isReconnecting = false;

function connect(url) {
    // 连接服务端
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
    }

    ws = new WebSocket(url);

    ws.onopen = function () {
        console.log('Connected to the WebSocket server.');
        // 重置错误状态
        hasError = false;
        document.getElementById('errorBanner').style.display = 'none';
    };

    ws.onmessage = function (event) {
        try {
            var message = JSON.parse(event.data);
            console.log('Received message:', message);

            if ('button' in message) {
                var btnMessage = message.button === "OFF" ? "❌ Off" : "✔️ On";
                document.getElementById('buttonStatus').textContent = btnMessage;
            }

            if ('temperature' in message && 'humidity' in message) {
                var temp = message.temperature;
                var humidity = message.humidity;
                var comfort = temp + (0.55 * (1 - (humidity / 100)) * (temp - 14.5));
                var feeling;

                // THI指数可视化
                if (comfort < 20) {
                    feeling = "Very Comfort"
                } else if (comfort >= 20 && comfort < 25) {
                    feeling = "Comfort"
                } else if (comfort >= 25 && comfort < 30) {
                    feeling = "Uncomfort"
                } else {
                    feeling = "Very Uncomfort"
                }

                document.getElementById('temperature').textContent = temp + '°C';
                document.getElementById('humidity').textContent = humidity + '%';
                document.getElementById('thi').textContent = parseFloat(comfort).toFixed(1) + " / " + feeling;

                temperatureData.push(temp);
                humidityData.push(humidity);
                thiData.push(comfort);
                timeData.push(formatTime(new Date()));

                updateChart();

                // 重置错误状态
                hasError = false;
                document.getElementById('errorBanner').style.display = 'none';
            }
        } catch (e) {
            console.error('Failed to parse message as JSON:', e);
            // 设置错误状态
            hasError = true;
            document.getElementById('errorBanner').style.display = 'block';
        }
    };

    ws.onerror = function (error) {
        console.error('WebSocket Error:', error);
        // 设置错误状态
        hasError = true;
        document.getElementById('errorBanner').style.display = 'block';
    };

    ws.onclose = function (event) {
        console.log('Disconnected from the WebSocket server. Code:', event.code, 'Reason:', event.reason);
        // 如果连接时出错，显示错误横幅
        if (hasError) {
            document.getElementById('errorBanner').style.display = 'block';
        }
        if (!isReconnecting) {
            isReconnecting = true;
            setTimeout(connect, reconnectInterval); // 尝试重新连接
        }
    };
}

function formatTime(date) {
    return date.toTimeString().slice(0, 8);
}

function updateChart() {
    chart.data.labels = timeData;
    chart.data.datasets[0].data = temperatureData;
    chart.data.datasets[1].data = humidityData;
    chart.data.datasets[2].data = thiData
    chart.update();
}

document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('myChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    pointStyle: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: false,
                    pointStyle: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'THI',
                    data: [],
                    borderColor: 'rgba(63, 105, 252, 1)',
                    backgroundColor: 'rgba(63, 105, 252, 0.2)',
                    fill: false,
                    pointStyle: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ],
            tension: 0.3
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (HH:mm:ss)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10,
                            color: '#6c757d'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10,
                            color: '#6c757d'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 12
                        },
                        color: '#6c757d'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 初始连接, 使用本地回环
    connect('ws://127.0.0.1');

    // 添加提交按钮的点击事件监听器
    document.getElementById('wsSubmit').addEventListener('click', function () {
        var wsUrl = document.getElementById('wsUrlInput').value.trim();
        if (wsUrl) {
            if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
                wsUrl = 'ws://' + wsUrl;
            }
            connect(wsUrl);
        }
    });
});