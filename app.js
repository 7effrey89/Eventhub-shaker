// Configuration and state
let config = {
    userName: '',
    eventhubUrl: '',
    sasKey: ''
};

let state = {
    isActive: false,
    shakeCount: 0,
    eventCount: 0,
    lastAcceleration: { x: 0, y: 0, z: 0 },
    currentAcceleration: { x: 0, y: 0, z: 0 },
    shakeThreshold: 15, // m/s² magnitude threshold for shake detection
    lastShakeTime: 0,
    shakeCooldown: 500 // ms between shake detections
};

// DOM elements
const configForm = document.getElementById('configForm');
const setupCard = document.getElementById('setupCard');
const monitorCard = document.getElementById('monitorCard');
const stopBtn = document.getElementById('stopBtn');
const displayName = document.getElementById('displayName');
const status = document.getElementById('status');
const shakeCountEl = document.getElementById('shakeCount');
const eventCountEl = document.getElementById('eventCount');
const accelXEl = document.getElementById('accelX');
const accelYEl = document.getElementById('accelY');
const accelZEl = document.getElementById('accelZ');
const accelMagEl = document.getElementById('accelMag');
const eventLog = document.getElementById('eventLog');

// Form submission handler
configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    config.userName = document.getElementById('userName').value.trim();
    config.eventhubUrl = document.getElementById('eventhubUrl').value.trim();
    config.sasKey = document.getElementById('sasKey').value.trim();
    
    // Validate inputs
    if (!config.userName || !config.eventhubUrl || !config.sasKey) {
        alert('Please fill in all fields');
        return;
    }
    
    // Request device motion permission (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                alert('Device motion permission is required to detect shaking');
                return;
            }
        } catch (error) {
            console.error('Error requesting device motion permission:', error);
            logEvent('error', 'Failed to get device motion permission');
        }
    }
    
    startMonitoring();
});

// Stop button handler
stopBtn.addEventListener('click', () => {
    stopMonitoring();
});

// Start monitoring
function startMonitoring() {
    state.isActive = true;
    state.shakeCount = 0;
    state.eventCount = 0;
    
    // Update UI
    setupCard.style.display = 'none';
    monitorCard.style.display = 'block';
    displayName.textContent = config.userName;
    
    // Add device motion listener
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleDeviceMotion);
        logEvent('info', 'Motion monitoring started');
    } else {
        logEvent('error', 'DeviceMotion API not supported');
        alert('Your device does not support motion detection. Please use a mobile device.');
    }
}

// Stop monitoring
function stopMonitoring() {
    state.isActive = false;
    
    // Remove device motion listener
    window.removeEventListener('devicemotion', handleDeviceMotion);
    
    // Update UI
    monitorCard.style.display = 'none';
    setupCard.style.display = 'block';
    
    logEvent('info', 'Motion monitoring stopped');
}

// Handle device motion events
function handleDeviceMotion(event) {
    if (!state.isActive) return;
    
    // Get acceleration including gravity
    const acceleration = event.accelerationIncludingGravity;
    
    if (!acceleration || acceleration.x === null) {
        // Fallback to acceleration without gravity if available
        const accel = event.acceleration;
        if (accel && accel.x !== null) {
            state.currentAcceleration = {
                x: accel.x || 0,
                y: accel.y || 0,
                z: accel.z || 0
            };
        }
    } else {
        state.currentAcceleration = {
            x: acceleration.x || 0,
            y: acceleration.y || 0,
            z: acceleration.z || 0
        };
    }
    
    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(
        Math.pow(state.currentAcceleration.x, 2) +
        Math.pow(state.currentAcceleration.y, 2) +
        Math.pow(state.currentAcceleration.z, 2)
    );
    
    // Calculate delta (change in acceleration)
    const delta = {
        x: state.currentAcceleration.x - state.lastAcceleration.x,
        y: state.currentAcceleration.y - state.lastAcceleration.y,
        z: state.currentAcceleration.z - state.lastAcceleration.z
    };
    
    const deltaMagnitude = Math.sqrt(
        Math.pow(delta.x, 2) +
        Math.pow(delta.y, 2) +
        Math.pow(delta.z, 2)
    );
    
    // Update UI with current values
    accelXEl.textContent = state.currentAcceleration.x.toFixed(2);
    accelYEl.textContent = state.currentAcceleration.y.toFixed(2);
    accelZEl.textContent = state.currentAcceleration.z.toFixed(2);
    accelMagEl.textContent = magnitude.toFixed(2);
    
    // Detect shake
    const now = Date.now();
    if (deltaMagnitude > state.shakeThreshold && (now - state.lastShakeTime) > state.shakeCooldown) {
        state.lastShakeTime = now;
        state.shakeCount++;
        shakeCountEl.textContent = state.shakeCount;
        
        // Visual feedback
        monitorCard.classList.add('shaking');
        setTimeout(() => {
            monitorCard.classList.remove('shaking');
        }, 500);
        
        // Send telemetry
        sendTelemetry(state.currentAcceleration, delta, magnitude, deltaMagnitude);
    }
    
    // Update last acceleration
    state.lastAcceleration = { ...state.currentAcceleration };
}

// Send telemetry to EventHub
async function sendTelemetry(acceleration, delta, magnitude, deltaMagnitude) {
    const timestamp = new Date().toISOString();
    
    // Determine shake intensity based on delta magnitude
    let shakeIntensity = 'low';
    if (deltaMagnitude > 25) {
        shakeIntensity = 'high';
    } else if (deltaMagnitude > 18) {
        shakeIntensity = 'medium';
    }
    
    const telemetryData = {
        timestamp: timestamp,
        userName: config.userName,
        eventType: 'shake',
        acceleration: {
            x: parseFloat(acceleration.x.toFixed(2)),
            y: parseFloat(acceleration.y.toFixed(2)),
            z: parseFloat(acceleration.z.toFixed(2)),
            magnitude: parseFloat(magnitude.toFixed(2))
        },
        deltaAcceleration: {
            x: parseFloat(delta.x.toFixed(2)),
            y: parseFloat(delta.y.toFixed(2)),
            z: parseFloat(delta.z.toFixed(2)),
            magnitude: parseFloat(deltaMagnitude.toFixed(2))
        },
        shakeIntensity: shakeIntensity
    };
    
    try {
        // Send to EventHub via REST API
        const response = await fetch(`${config.eventhubUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.sasKey
            },
            body: JSON.stringify(telemetryData)
        });
        
        if (response.ok) {
            state.eventCount++;
            eventCountEl.textContent = state.eventCount;
            logEvent('success', `Shake detected! Intensity: ${shakeIntensity} (Δ${deltaMagnitude.toFixed(2)} m/s²)`);
        } else {
            const errorText = await response.text();
            logEvent('error', `Failed to send: ${response.status} - ${errorText.substring(0, 50)}`);
            console.error('EventHub error:', response.status, errorText);
        }
    } catch (error) {
        logEvent('error', `Network error: ${error.message}`);
        console.error('Error sending telemetry:', error);
    }
}

// Log events to the UI
function logEvent(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    eventLog.insertBefore(logEntry, eventLog.firstChild);
    
    // Keep only last 20 entries
    while (eventLog.children.length > 20) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    logEvent('info', 'Application ready. Please configure your settings.');
    
    // Check for DeviceMotion support
    if (!window.DeviceMotionEvent) {
        logEvent('error', 'Device motion not supported on this device');
    }
});
