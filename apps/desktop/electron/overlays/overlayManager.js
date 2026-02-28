'use strict';

const interventionOverlay = require('./interventionOverlay');
const focusBarOverlay = require('./focusBarOverlay');
const countdownOverlay = require('./countdownOverlay');
const creditNotificationOverlay = require('./creditNotificationOverlay');
const sessionLockOverlay = require('./sessionLockOverlay');

/**
 * OverlayManager — single entry point for all system-level overlay windows.
 * Main process imports only this module.
 */
class OverlayManager {
    constructor() {
        this._initialized = false;
    }

    /**
     * Create all overlay windows. Called once on app.whenReady().
     * @param {boolean} isDev
     */
    initAll(isDev) {
        try {
            interventionOverlay.create(isDev);
            focusBarOverlay.create(isDev);
            countdownOverlay.create(isDev);
            creditNotificationOverlay.create(isDev);
            sessionLockOverlay.create(isDev);
            this._initialized = true;
            console.log('[overlayManager] All overlay windows created');
        } catch (err) {
            console.error('[overlayManager] initAll failed:', err.message);
        }
    }

    // ─── Intervention ───────────────────────────────────────────

    /**
     * Show the intervention overlay.
     * @param {object} data - { level, mode, appName, message, streakSecs, distractionCount, countdownSecs, ... }
     */
    showIntervention(data) {
        interventionOverlay.show(data);
        // If L3 with countdown, also show the countdown timer
        if (data.level >= 3 && data.countdownSecs > 0) {
            countdownOverlay.show({
                seconds: data.countdownSecs,
                appName: data.appName,
            });
        }
    }

    hideIntervention() {
        interventionOverlay.hide();
        countdownOverlay.hide();
    }

    tickIntervention(remaining) {
        interventionOverlay.tick(remaining);
        countdownOverlay.tick(remaining);
    }

    captureInterventionMouse() {
        interventionOverlay.captureMouse();
    }

    releaseInterventionMouse() {
        interventionOverlay.releaseMouse();
    }

    // ─── Focus Bar ──────────────────────────────────────────────

    /**
     * Update the focus bar strip.
     * @param {{ score: number, streak: number, task: string, credits: number }} data
     */
    updateFocusBar(data) {
        focusBarOverlay.update(data);
    }

    showFocusBar() {
        focusBarOverlay.show();
    }

    hideFocusBar() {
        focusBarOverlay.hide();
    }

    // ─── Countdown ──────────────────────────────────────────────

    showCountdown(data) {
        countdownOverlay.show(data);
    }

    tickCountdown(remaining) {
        countdownOverlay.tick(remaining);
    }

    hideCountdown() {
        countdownOverlay.hide();
    }

    // ─── Credit Notification ────────────────────────────────────

    /**
     * Show a credit earned toast.
     * @param {{ amount: number, reason: string }} data
     */
    showCreditEarned(data) {
        creditNotificationOverlay.show(data);
    }

    // ─── Session Lock ───────────────────────────────────────────

    showSessionLock(data) {
        sessionLockOverlay.show(data);
    }

    hideSessionLock() {
        sessionLockOverlay.hide();
    }

    captureSessionLockMouse() {
        sessionLockOverlay.captureMouse();
    }

    releaseSessionLockMouse() {
        sessionLockOverlay.releaseMouse();
    }

    // ─── Lifecycle ──────────────────────────────────────────────

    destroyAll() {
        try {
            interventionOverlay.destroy();
            focusBarOverlay.destroy();
            countdownOverlay.destroy();
            creditNotificationOverlay.destroy();
            sessionLockOverlay.destroy();
            console.log('[overlayManager] All overlay windows destroyed');
        } catch (err) {
            console.error('[overlayManager] destroyAll failed:', err.message);
        }
    }
}

module.exports = new OverlayManager();
