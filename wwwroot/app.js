const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN = 500;
const SHAKE_INTENSITY_HIGH = 25;
const SHAKE_INTENSITY_MEDIUM = 18;
const CUSTOM_CONNECTION_KEY = 'eventhub_custom_connection';

let state = {
    active: false,
    shakeCount: 0,
    eventCount: 0,
    lastAcceleration: { x: 0, y: 0, z: 0 },
    lastShakeTime: 0,
    userName: '',
    customConnection: null
};

// Load custom connection from localStorage
function loadCustomConnection() {
    const saved = localStorage.getItem(CUSTOM_CONNECTION_KEY);
    if (saved) {
        try {
            state.customConnection = JSON.parse(saved);
            return state.customConnection;
        } catch {
            localStorage.removeItem(CUSTOM_CONNECTION_KEY);
        }
    }
    return null;
}

// Save custom connection to localStorage
function saveCustomConnection(connectionString) {
    const data = { connectionString, savedAt: new Date().toISOString() };
    localStorage.setItem(CUSTOM_CONNECTION_KEY, JSON.stringify(data));
    state.customConnection = data;
}

// Remove custom connection
function clearCustomConnection() {
    localStorage.removeItem(CUSTOM_CONNECTION_KEY);
    state.customConnection = null;
}

// Initialize custom connection on load
loadCustomConnection();

// Check URL parameters for connection string and userName
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const connString = params.get('conn');
    const userName = params.get('userName');
    
    if (connString) {
        try {
            // Decode the connection string from base64
            const decoded = atob(connString);
            
            // Auto-apply the connection string
            saveCustomConnection(decoded);
            
            // Log message after DOM is ready
            console.log('Connection string loaded from URL and applied');
        } catch (err) {
            console.error('Failed to decode connection string from URL:', err);
        }
    }
    
    if (userName) {
        // Pre-fill the userName field
        const userNameInput = document.getElementById('userName');
        if (userNameInput) {
            userNameInput.value = decodeURIComponent(userName);
        }
    }
    
    // Return whether we had URL params (don't clean URL yet)
    return (connString || userName) ? true : false;
}

// Run on page load
const hadUrlParams = checkUrlParameters();

// Show log message after DOM elements are available
if (hadUrlParams) {
    // Wait for DOM to be fully ready, then show message
    setTimeout(() => {
        if (typeof log === 'function') {
            log('info', 'Configuration loaded from URL');
        }
    }, 100);
}

const setupCard = document.getElementById('setupCard');
const monitorCard = document.getElementById('monitorCard');
const configForm = document.getElementById('configForm');
const beginMonitoringBtn = document.getElementById('beginMonitoringBtn');
const stopBtn = document.getElementById('stopBtn');
const randomShakeBtn = document.getElementById('randomShakeBtn');
const displayName = document.getElementById('displayName');
const shakeCountEl = document.getElementById('shakeCount');
const eventCountEl = document.getElementById('eventCount');
const accelXEl = document.getElementById('accelX');
const accelYEl = document.getElementById('accelY');
const accelZEl = document.getElementById('accelZ');
const accelMagEl = document.getElementById('accelMag');
const eventLog = document.getElementById('eventLog');

// Settings modal elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModal');
const settingsForm = document.getElementById('settingsForm');
const connectionStringInput = document.getElementById('connectionString');
const revertBtn = document.getElementById('revertBtn');
const settingsStatus = document.getElementById('settingsStatus');
const qrSection = document.getElementById('qrSection');
const qrCodeDiv = document.getElementById('qrcode');
const shareUrlInput = document.getElementById('shareUrl');
const copyUrlBtn = document.getElementById('copyUrlBtn');

let qrCodeInstance = null;

console.log('beginMonitoringBtn:', beginMonitoringBtn);

beginMonitoringBtn.addEventListener('click', async () => {
    console.log('Button clicked!');
    const userNameInput = document.getElementById('userName');
    state.userName = userNameInput.value.trim();
    console.log('userName:', state.userName);
    if (!state.userName) {
        userNameInput.focus();
        return;
    }
    
    // Clean up URL if we had parameters
    if (hadUrlParams) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    await requestMotionPermission();
    start();
});

// Allow Enter key to submit
configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    beginMonitoringBtn.click();
});

stopBtn.addEventListener('click', () => stop());
randomShakeBtn.addEventListener('click', () => simulateRandomShake());

// Settings modal handlers
settingsBtn.addEventListener('click', () => openSettingsModal());
closeModalBtn.addEventListener('click', () => closeSettingsModal());
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const connectionString = connectionStringInput.value.trim();
    if (!connectionString) return;
    
    showSettingsStatus('info', 'Validating connection...');
    
    try {
        // Test the connection by sending to the new endpoint
        const testPayload = {
            connectionString,
            telemetry: null // Just validate, don't send
        };
        
        const res = await fetch('/api/telemetry-custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });
        
        if (res.ok) {
            saveCustomConnection(connectionString);
            showSettingsStatus('success', '✓ Connection string saved and validated!');
            generateQRCode(connectionString);
            // Don't auto-close so user can see/scan QR code
        } else {
            const error = await res.text();
            showSettingsStatus('error', `Failed to validate: ${error}`);
        }
    } catch (err) {
        showSettingsStatus('error', `Network error: ${err.message}`);
    }
});

revertBtn.addEventListener('click', () => {
    clearCustomConnection();
    connectionStringInput.value = '';
    showSettingsStatus('success', '✓ Reverted to default connection string');
    qrSection.style.display = 'none';
    setTimeout(() => closeSettingsModal(), 1500);
});

copyUrlBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shareUrlInput.value);
        const originalText = copyUrlBtn.textContent;
        copyUrlBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyUrlBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        shareUrlInput.select();
        document.execCommand('copy');
        copyUrlBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyUrlBtn.textContent = 'Copy';
        }, 2000);
    }
});

function openSettingsModal() {
    if (state.customConnection) {
        connectionStringInput.value = state.customConnection.connectionString;
        generateQRCode(state.customConnection.connectionString);
    } else {
        qrSection.style.display = 'none';
    }
    settingsModal.style.display = 'flex';
    settingsStatus.className = 'modal-status';
    settingsStatus.textContent = '';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
    connectionStringInput.value = '';
    settingsStatus.className = 'modal-status';
    settingsStatus.textContent = '';
    qrSection.style.display = 'none';
}

function showSettingsStatus(type, message) {
    settingsStatus.className = `modal-status ${type}`;
    settingsStatus.textContent = message;
}

function generateQRCode(connectionString) {
    // Generate URL with encoded connection string
    const baseUrl = window.location.origin + window.location.pathname;
    const encoded = btoa(connectionString); // Base64 encode
    const shareUrl = `${baseUrl}?conn=${encodeURIComponent(encoded)}`;
    
    // Update share URL input
    shareUrlInput.value = shareUrl;
    
    // Clear existing QR code
    qrCodeDiv.innerHTML = '';
    
    // Generate new QR code
    try {
        qrCodeInstance = new QRCode(qrCodeDiv, {
            text: shareUrl,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
        
        qrSection.style.display = 'block';
    } catch (err) {
        console.error('Failed to generate QR code:', err);
        showSettingsStatus('error', 'Failed to generate QR code');
    }
}

async function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const perm = await DeviceMotionEvent.requestPermission();
            if (perm !== 'granted') throw new Error('Permission denied');
        } catch {
            log('error', 'Motion permission denied');
        }
    }
}

function start() {
    state.active = true;
    state.shakeCount = 0;
    state.eventCount = 0;
    setupCard.style.display = 'none';
    monitorCard.style.display = 'block';
    displayName.textContent = state.userName;
    window.addEventListener('devicemotion', onMotion);
    log('info', 'Monitoring started');
}

function stop() {
    state.active = false;
    window.removeEventListener('devicemotion', onMotion);
    monitorCard.style.display = 'none';
    setupCard.style.display = 'block';
    log('info', 'Monitoring stopped');
}

function onMotion(ev) {
    if (!state.active) return;
    const a = ev.accelerationIncludingGravity || ev.acceleration;
    if (!a) return;

    const current = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    const mag = Math.sqrt(current.x**2 + current.y**2 + current.z**2);
    updateAccelDisplay(current, mag);

    const delta = {
        x: current.x - state.lastAcceleration.x,
        y: current.y - state.lastAcceleration.y,
        z: current.z - state.lastAcceleration.z
    };
    const deltaMag = Math.sqrt(delta.x**2 + delta.y**2 + delta.z**2);

    const now = Date.now();
    if (deltaMag > SHAKE_THRESHOLD && (now - state.lastShakeTime) > SHAKE_COOLDOWN) {
        registerShake(current, delta, mag, deltaMag);
    }
    state.lastAcceleration = current;
}

function simulateRandomShake() {
    if (!state.active) return;
    // Generate random acceleration values within plausible range
    const current = {
        x: (Math.random() * 20 - 10),
        y: (Math.random() * 20 - 10),
        z: (Math.random() * 20 - 10)
    };
    const mag = Math.sqrt(current.x**2 + current.y**2 + current.z**2);
    const delta = {
        x: current.x - state.lastAcceleration.x,
        y: current.y - state.lastAcceleration.y,
        z: current.z - state.lastAcceleration.z
    };
    const deltaMag = Math.sqrt(delta.x**2 + delta.y**2 + delta.z**2);

    registerShake(current, delta, mag, deltaMag, true);
    state.lastAcceleration = current;
}

function registerShake(current, delta, mag, deltaMag, simulated = false) {
    state.lastShakeTime = Date.now();
    state.shakeCount++;
    shakeCountEl.textContent = state.shakeCount;
    updateAccelDisplay(current, mag);
    sendTelemetry(current, delta, mag, deltaMag, simulated);
}

function updateAccelDisplay(current, mag) {
    accelXEl.textContent = current.x.toFixed(2);
    accelYEl.textContent = current.y.toFixed(2);
    accelZEl.textContent = current.z.toFixed(2);
    accelMagEl.textContent = mag.toFixed(2);
}

async function sendTelemetry(accel, delta, mag, deltaMag, simulated = false) {
    let intensity = 'low';
    if (deltaMag > SHAKE_INTENSITY_HIGH) intensity = 'high';
    else if (deltaMag > SHAKE_INTENSITY_MEDIUM) intensity = 'medium';

    const payload = {
        timestamp: new Date().toISOString(),
        userName: state.userName,
        eventType: simulated ? 'simulated-shake' : 'shake',
        acceleration: {
            x: +accel.x.toFixed(2),
            y: +accel.y.toFixed(2),
            z: +accel.z.toFixed(2),
            magnitude: +mag.toFixed(2)
        },
        deltaAcceleration: {
            x: +delta.x.toFixed(2),
            y: +delta.y.toFixed(2),
            z: +delta.z.toFixed(2),
            magnitude: +deltaMag.toFixed(2)
        },
        shakeIntensity: intensity
    };

    try {
        let res;
        // Use custom endpoint if custom connection is configured
        if (state.customConnection) {
            res = await fetch('/api/telemetry-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionString: state.customConnection.connectionString,
                    telemetry: payload
                })
            });
        } else {
            // Use default endpoint
            res = await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        if (res.ok) {
            state.eventCount++;
            eventCountEl.textContent = state.eventCount;
            const source = state.customConnection ? ' (custom)' : '';
            log('success', `${simulated ? 'Simulated' : 'Real'} shake sent (Δ${deltaMag.toFixed(2)} m/s², ${intensity})${source}`);
        } else {
            log('error', `Send failed HTTP ${res.status}`);
        }
    } catch {
        log('error', 'Network error sending telemetry');
    }
}

function log(type, msg) {
    const div = document.createElement('div');
    div.className = `log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    eventLog.prepend(div);
    while (eventLog.children.length > 20) eventLog.removeChild(eventLog.lastChild);
}
