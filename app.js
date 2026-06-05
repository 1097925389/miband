/**
 * Mi Pulse - Mi Band 10 Pro Heart Rate Monitor
 * Core Logic using Web Bluetooth API
 */

// State Management
let bluetoothDevice = null;
let heartRateCharacteristic = null;
let heartRateHistory = [];
let chart = null;

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const bpmValueDisplay = document.getElementById('bpm-value');
const statusBadge = document.getElementById('status-badge');
const heartContainer = document.getElementById('heart-container');
const heartSvg = document.querySelector('.heart-svg');
const maxBpmDisplay = document.getElementById('max-bpm');
const avgBpmDisplay = document.getElementById('avg-bpm');
const minBpmDisplay = document.getElementById('min-bpm');
const toast = document.getElementById('toast');

// Initialize Chart
function initChart() {
    const ctx = document.getElementById('hrChart').getContext('2d');
    
    // Gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(255, 59, 59, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 59, 59, 0)');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '心率 (BPM)',
                data: [],
                borderColor: '#ff3b3b',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { display: false },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            },
            animation: { duration: 0 } // Faster updates
        }
    });
}

// Bluetooth Connection Logic
async function connect() {
    try {
        showToast('正在请求蓝牙权限...');
        
        // Request device with Heart Rate Service
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }]
        });

        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        showToast('正在连接到设备...');
        const server = await bluetoothDevice.gatt.connect();

        showToast('获取心率服务...');
        const service = await server.getPrimaryService('heart_rate');

        showToast('启动通知...');
        heartRateCharacteristic = await service.getCharacteristic('heart_rate_measurement');
        
        await heartRateCharacteristic.startNotifications();
        heartRateCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRateChanged);

        // Update UI
        updateUIState(true);
        showToast('已成功连接！同步中...');
        
    } catch (error) {
        console.error('Bluetooth Error:', error);
        showToast(`错误: ${error.message}`);
    }
}

function handleHeartRateChanged(event) {
    const value = event.target.value;
    const bpm = parseHeartRate(value);
    
    updateDisplay(bpm);
}

/**
 * Standard Heart Rate Measurement Packet Parser
 * Byte 0: Flags (Bit 0 determines if 8-bit or 16-bit value)
 */
function parseHeartRate(value) {
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    if (rate16Bits) {
        return value.getUint16(1, true);
    } else {
        return value.getUint8(1);
    }
}

function updateDisplay(bpm) {
    // 1. Update text
    bpmValueDisplay.textContent = bpm;
    
    // 2. Update heart animation speed
    // 60 / bpm = seconds per beat
    const duration = 60 / bpm;
    heartContainer.classList.add('beating');
    heartContainer.style.setProperty('--duration', `${duration}s`);
    
    // Visual feedback on the SVG scale
    heartSvg.style.transform = 'scale(1.2)';
    setTimeout(() => heartSvg.style.transform = 'scale(1)', 100);

    // 3. Update History & Statistics
    heartRateHistory.push(bpm);
    if (heartRateHistory.length > 100) heartRateHistory.shift();

    const max = Math.max(...heartRateHistory);
    const min = Math.min(...heartRateHistory);
    const avg = Math.round(heartRateHistory.reduce((a, b) => a + b, 0) / heartRateHistory.length);

    maxBpmDisplay.textContent = max;
    minBpmDisplay.textContent = min;
    avgBpmDisplay.textContent = avg;

    // 4. Update Chart
    chart.data.labels.push('');
    chart.data.datasets[0].data.push(bpm);
    
    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    
    chart.update();
}

function updateUIState(connected) {
    if (connected) {
        statusBadge.textContent = '已连接';
        statusBadge.classList.replace('disconnected', 'connected');
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        heartContainer.classList.add('beating');
    } else {
        statusBadge.textContent = '未连接';
        statusBadge.classList.replace('connected', 'disconnected');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        bpmValueDisplay.textContent = '--';
        heartContainer.classList.remove('beating');
        
        maxBpmDisplay.textContent = '--';
        avgBpmDisplay.textContent = '--';
        minBpmDisplay.textContent = '--';
    }
}

async function disconnect() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        await bluetoothDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    showToast('设备已断开连接');
    updateUIState(false);
    heartRateHistory = [];
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event Listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);

// Init
window.onload = () => {
    initChart();
};
