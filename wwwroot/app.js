const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN = 500;
const SHAKE_INTENSITY_HIGH = 25;
const SHAKE_INTENSITY_MEDIUM = 18;

let state = {
    active: false,
    shakeCount: 0,
    eventCount: 0,
    lastAcceleration: { x: 0, y: 0, z: 0 },
    lastShakeTime: 0,
    userName: ''
};

const setupCard = document.getElementById('setupCard');
const monitorCard = document.getElementById('monitorCard');
const configForm = document.getElementById('configForm');
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

configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.userName = document.getElementById('userName').value.trim();
    if (!state.userName) return;
    await requestMotionPermission();
    start();
});

stopBtn.addEventListener('click', () => stop());
randomShakeBtn.addEventListener('click', () => simulateRandomShake());

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
        const res = await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            state.eventCount++;
            eventCountEl.textContent = state.eventCount;
            log('success', `${simulated ? 'Simulated' : 'Real'} shake sent (?${deltaMag.toFixed(2)} m/s², ${intensity})`);
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
