'use strict';

const { uIOhook, UiohookKey } = require('uiohook-napi');

// --- Internal State ---
let isMonitoring = false;
let eventTimestamps = []; // rolling window of event timestamps
const WINDOW_MS = 10000; // 10-second rolling window
const SAMPLE_INTERVAL = 500; // debounce: only record one event per 500ms

let lastEventTime = 0;

// --- Activity Level Thresholds ---
const THRESHOLDS = {
    HIGH: 10,   // > 10 events in 10s
    MEDIUM: 3,  // 3–10 events in 10s
    LOW: 1,     // 1–3 events in 10s
};

// --- Screenshot Interval Mapping ---
const INTERVALS = {
    HIGH: 5000,    // 5 seconds — active typing/clicking
    MEDIUM: 10000, // 10 seconds — moderate activity
    LOW: 15000,    // 15 seconds — minimal activity (e.g. watching/reading)
    IDLE: 20000,   // 20 seconds — no input but session is active (e.g. video)
};

/**
 * Prune timestamps older than the rolling window.
 */
function pruneEvents() {
    const cutoff = Date.now() - WINDOW_MS;
    eventTimestamps = eventTimestamps.filter((t) => t > cutoff);
}

/**
 * Handle an input event (keyboard or mouse).
 * Debounced to one event per SAMPLE_INTERVAL.
 */
function onInputEvent() {
    const now = Date.now();
    if (now - lastEventTime < SAMPLE_INTERVAL) return;
    lastEventTime = now;
    eventTimestamps.push(now);
}

/**
 * Start monitoring keyboard and mouse events globally.
 */
function startMonitoring() {
    try {
        if (isMonitoring) return;
        isMonitoring = true;
        eventTimestamps = [];
        lastEventTime = 0;

        uIOhook.on('keydown', onInputEvent);
        uIOhook.on('mousedown', onInputEvent);
        uIOhook.on('mousemove', onInputEvent);
        uIOhook.on('wheel', onInputEvent);

        uIOhook.start();
        console.log('[inputMonitor] Monitoring started');
    } catch (err) {
        console.error('[inputMonitor] startMonitoring failed:', err.message);
    }
}

/**
 * Stop monitoring keyboard and mouse events.
 */
function stopMonitoring() {
    try {
        if (!isMonitoring) return;
        isMonitoring = false;

        uIOhook.stop();
        eventTimestamps = [];
        lastEventTime = 0;

        console.log('[inputMonitor] Monitoring stopped');
    } catch (err) {
        console.error('[inputMonitor] stopMonitoring failed:', err.message);
    }
}

/**
 * Get the current activity level based on events in the rolling window.
 * @returns {'HIGH' | 'MEDIUM' | 'LOW' | 'IDLE'}
 */
function getActivityLevel() {
    try {
        pruneEvents();
        const count = eventTimestamps.length;

        if (count > THRESHOLDS.HIGH) return 'HIGH';
        if (count >= THRESHOLDS.MEDIUM) return 'MEDIUM';
        if (count >= THRESHOLDS.LOW) return 'LOW';
        return 'IDLE';
    } catch (err) {
        console.error('[inputMonitor] getActivityLevel failed:', err.message);
        return 'IDLE';
    }
}

/**
 * Get the recommended screenshot interval in milliseconds,
 * or null if the user is idle (no screenshots should be taken).
 * @returns {number|null}
 */
function getScreenshotInterval() {
    try {
        const level = getActivityLevel();
        return INTERVALS[level];
    } catch (err) {
        console.error('[inputMonitor] getScreenshotInterval failed:', err.message);
        return null;
    }
}

module.exports = { startMonitoring, stopMonitoring, getActivityLevel, getScreenshotInterval };
