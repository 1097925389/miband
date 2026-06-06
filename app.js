/**
 * Mi Band - Mi Band 10 Pro Heart Rate Monitor
 * Core Logic using Web Bluetooth API
 */

// State Management
let bluetoothDevice = null;
let heartRateCharacteristic = null;
let heartRateHistory = [];
let chart = null;
let currentSession = null;
let sessionsHistory = [];

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
const hintModal = document.getElementById('hint-modal');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Modal Utility
function showHintModal() {
    hintModal.classList.add('show');
}

function closeModal() {
    hintModal.classList.remove('show');
}

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
        closeModal(); // Ensure modal is closed before new attempt
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
        
        // Start new session
        currentSession = {
            id: Date.now().toString(),
            startTime: Date.now(),
            endTime: null,
            data: [],
            stats: { min: 0, max: 0, avg: 0 }
        };
        localStorage.setItem('miband_active_session', JSON.stringify(currentSession));
        
    } catch (error) {
        console.error('Bluetooth Error:', error);
        
        // Specific user-friendly handling
        if (error.name === 'NetworkError' || error.name === 'NotFoundError' || error.name === 'NotSupportedError') {
            showHintModal();
        } else {
            showToast(`错误: ${error.message}`);
        }
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
    let max = bpm;
    let min = bpm;
    let avg = bpm;

    if (currentSession) {
        currentSession.data.push({ t: Date.now(), v: bpm });
        localStorage.setItem('miband_active_session', JSON.stringify(currentSession));
        
        const bpms = currentSession.data.map(d => d.v);
        max = Math.max(...bpms);
        min = Math.min(...bpms);
        avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
    } else {
        heartRateHistory.push(bpm);
        if (heartRateHistory.length > 100) heartRateHistory.shift();
        max = Math.max(...heartRateHistory);
        min = Math.min(...heartRateHistory);
        avg = Math.round(heartRateHistory.reduce((a, b) => a + b, 0) / heartRateHistory.length);
    }

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
    finalizeCurrentSession();
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
clearHistoryBtn.addEventListener('click', clearAllHistory);

// Utility and History logic
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(start, end) {
    const diffMs = end - start;
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}分`);
    parts.push(`${seconds}秒`);
    return parts.join('');
}

function finalizeCurrentSession() {
    if (!currentSession) return;
    
    currentSession.endTime = Date.now();
    
    if (currentSession.data.length > 0) {
        const bpms = currentSession.data.map(d => d.v);
        const min = Math.min(...bpms);
        const max = Math.max(...bpms);
        const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
        
        currentSession.stats = { min, max, avg };
        
        sessionsHistory.unshift(currentSession);
        localStorage.setItem('miband_history', JSON.stringify(sessionsHistory));
        showToast('心率记录已自动保存');
    }
    
    currentSession = null;
    localStorage.removeItem('miband_active_session');
    renderHistory();
}

function checkInterruptedSession() {
    const interrupted = localStorage.getItem('miband_active_session');
    if (interrupted) {
        try {
            const session = JSON.parse(interrupted);
            if (session && session.data && session.data.length > 0) {
                session.endTime = session.data[session.data.length - 1].t; // Use last timestamp as end time
                const bpms = session.data.map(d => d.v);
                const min = Math.min(...bpms);
                const max = Math.max(...bpms);
                const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
                session.stats = { min, max, avg };
                
                sessionsHistory.unshift(session);
                localStorage.setItem('miband_history', JSON.stringify(sessionsHistory));
                console.log('Recovered interrupted session.');
            }
        } catch (e) {
            console.error('Error recovering interrupted session:', e);
        }
        localStorage.removeItem('miband_active_session');
    }
}

function renderHistory() {
    if (sessionsHistory.length === 0) {
        historyEmpty.style.display = 'flex';
        historyList.style.display = 'none';
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    historyEmpty.style.display = 'none';
    historyList.style.display = 'flex';
    clearHistoryBtn.style.display = 'block';
    
    historyList.innerHTML = '';
    
    sessionsHistory.forEach(session => {
        const durationStr = formatDuration(session.startTime, session.endTime);
        const dateStr = formatDateTime(session.startTime);
        
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="history-card-header">
                <span class="history-card-title">心率监测记录</span>
                <span class="history-card-time">${dateStr}</span>
            </div>
            <div class="history-card-stats">
                <div class="history-card-stat">
                    <span class="label">时长</span>
                    <span class="value">${durationStr}</span>
                </div>
                <div class="history-card-stat">
                    <span class="label">最高</span>
                    <span class="value">${session.stats.max} BPM</span>
                </div>
                <div class="history-card-stat">
                    <span class="label">最低</span>
                    <span class="value">${session.stats.min} BPM</span>
                </div>
                <div class="history-card-stat">
                    <span class="label">平均</span>
                    <span class="value">${session.stats.avg} BPM</span>
                </div>
            </div>
            <div class="history-card-actions">
                <button class="action-btn export-btn" onclick="exportSession('${session.id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    导出 CSV
                </button>
                <button class="action-btn delete-btn" onclick="deleteSession('${session.id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    删除
                </button>
            </div>
        `;
        historyList.appendChild(card);
    });
}

function exportSession(sessionId) {
    const session = sessionsHistory.find(s => s.id === sessionId);
    if (!session) return;
    
    let csvContent = '\uFEFF'; // Add BOM for Excel compatibility with Chinese
    csvContent += '时间,心率 (BPM)\n';
    
    session.data.forEach(item => {
        csvContent += `"${formatDateTime(item.t)}",${item.v}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateObj = new Date(session.startTime);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const localDateStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `miband_record_${localDateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('数据导出成功');
}

function deleteSession(sessionId) {
    if (confirm('确定要删除这条记录吗？')) {
        sessionsHistory = sessionsHistory.filter(s => s.id !== sessionId);
        localStorage.setItem('miband_history', JSON.stringify(sessionsHistory));
        renderHistory();
        showToast('记录已删除');
    }
}

function clearAllHistory() {
    if (confirm('确定要清空所有历史记录吗？此操作无法撤销。')) {
        sessionsHistory = [];
        localStorage.removeItem('miband_history');
        renderHistory();
        showToast('所有历史记录已清空');
    }
}

// Expose functions to window for onclick handlers
window.exportSession = exportSession;
window.deleteSession = deleteSession;

// Init
window.onload = () => {
    initChart();
    
    // Load history
    const storedHistory = localStorage.getItem('miband_history');
    if (storedHistory) {
        try {
            sessionsHistory = JSON.parse(storedHistory);
        } catch (e) {
            console.error('Failed to parse history', e);
        }
    }
    
    // Recovery check
    checkInterruptedSession();
    
    // Render
    renderHistory();
};
