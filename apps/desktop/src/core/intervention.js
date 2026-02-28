'use strict';

const { exec } = require('child_process');
const { EventEmitter } = require('events');

// --- FSM States ---
const STATES = {
    IDLE: 'IDLE',
    MONITORING: 'MONITORING',
    DRIFTING: 'DRIFTING',
    INTERVENING: 'INTERVENING',
    RETURNING: 'RETURNING',
};

// --- Intervention Messages ---
const INTERVENTION_MESSAGES = {
    L1: {
        gentle: 'Hey! Looks like you drifted. You\'ve got this.',
        balanced: 'Heads up — [appName] isn\'t part of your plan right now.',
        strict: 'Distraction detected. Return to your task.',
    },
    L2: {
        gentle: 'Still there? Your task is waiting for you.',
        balanced: 'You\'ve been off-task for a while. Time to refocus.',
        strict: 'Focus breach. Get back on task now.',
    },
    L3: {
        gentle: 'This is your third nudge. Consider closing [appName].',
        balanced: 'Closing [appName] in [countdown]s unless you return.',
        strict: 'Closing [appName] in [countdown]s. No extensions.',
    },
};

// --- Mode Config ---
const MODE_CONFIG = {
    gentle: {
        blurLevels: [0, 4, 4],          // L1, L2, L3 blur px
        bgOpacity: 0.4,
        countdownSecs: 0,               // no countdown
        forceAction: 'none',            // never force-close
        creditRate: 10,                 // credits per 5min focus
        creditCost: 10,                 // credits for 5min delay
        buttonDelay: 0,                 // buttons appear immediately
        position: 'bottom-right',
        creditsEnabled: true,
    },
    balanced: {
        blurLevels: [6, 12, 12],
        bgOpacity: 0.55,
        countdownSecs: 30,
        forceAction: 'minimize',
        creditRate: 7,
        creditCost: 20,
        buttonDelay: 5,                 // 5s forced delay before buttons
        position: 'bottom-right',
        creditsEnabled: true,
    },
    strict: {
        blurLevels: [8, 16, 16],
        bgOpacity: 0.65,
        countdownSecs: 15,
        forceAction: 'kill',
        creditRate: 0,
        creditCost: 0,
        buttonDelay: 10,               // 10s forced delay
        position: 'center',
        creditsEnabled: false,
    },
};

class InterventionEngine extends EventEmitter {
    constructor() {
        super();
        this.state = STATES.IDLE;
        this.driftCounter = 0;
        this.focusCounter = 0;
        this.mode = 'balanced';
        this.settings = { forceCloseEnabled: false };
        this._countdownTimer = null;
        this._countdownRemaining = 0;
        this._pendingForceClose = null;    // { appName, processName }
    }

    /**
     * Set the current intervention mode.
     * @param {'gentle'|'balanced'|'strict'} mode
     */
    setMode(mode) {
        if (MODE_CONFIG[mode]) {
            this.mode = mode;
            console.log(`[intervention] Mode set to: ${mode}`);
        }
    }

    /**
     * Get the current mode.
     * @returns {string}
     */
    getMode() {
        return this.mode;
    }

    /**
     * Get the mode configuration.
     * @returns {object}
     */
    getModeConfig() {
        return MODE_CONFIG[this.mode] || MODE_CONFIG.balanced;
    }

    /**
     * Process a new relevance score and determine the appropriate action.
     * @param {number} score - Relevance score 0-100
     * @param {string} activityType - Activity type
     * @param {number} confidence - Confidence 0-100
     * @param {string} [appName] - Name of the detected app
     * @returns {{level: number, type: string, message: string, mode: string, blurPx: number, countdownSecs: number, buttonDelay: number, position: string, creditsEnabled: boolean}|null}
     */
    processScore(score, activityType, confidence, appName) {
        try {
            if (this.state === STATES.IDLE) {
                this.state = STATES.MONITORING;
            }

            // On-task: score >= 70
            if (score >= 70) {
                this.driftCounter = 0;
                this.focusCounter++;
                if (this.focusCounter >= 2) {
                    this.state = STATES.MONITORING;
                }
                return null;
            }

            // Off-task
            this.focusCounter = 0;
            this.driftCounter++;

            // Low confidence — don't intervene yet
            if (confidence <= 60 && this.driftCounter < 3) {
                this.state = STATES.DRIFTING;
                return null;
            }

            this.state = STATES.INTERVENING;
            return this._buildAction(appName || 'Unknown', activityType);
        } catch (err) {
            console.error('[intervention] processScore failed:', err.message);
            return null;
        }
    }

    /**
     * Process an instant detection from Layer 1/2.
     * @param {number} score
     * @param {string} category
     * @param {string} [appName]
     * @returns {object|null}
     */
    processInstant(score, category, appName) {
        try {
            if (this.state === STATES.IDLE) {
                this.state = STATES.MONITORING;
            }

            if (score >= 70) {
                this.driftCounter = 0;
                this.focusCounter += 2;
                this.state = STATES.MONITORING;
                return null;
            }

            // High-confidence distraction — escalate faster
            this.focusCounter = 0;
            this.driftCounter += 2;
            this.state = STATES.INTERVENING;

            return this._buildAction(appName || 'Unknown', category);
        } catch (err) {
            console.error('[intervention] processInstant failed:', err.message);
            return null;
        }
    }

    /**
     * Build a mode-aware intervention action based on current drift level.
     * @param {string} appName
     * @param {string} activityType
     * @returns {object}
     * @private
     */
    _buildAction(appName, activityType) {
        const cfg = this.getModeConfig();
        let level, messageTemplate, type;

        if (this.driftCounter >= 4 && this.mode !== 'gentle') {
            // L3 — force-close warning or action
            level = 3;
            messageTemplate = INTERVENTION_MESSAGES.L3[this.mode];
            type = 'FORCE_CLOSE_WARNING';
        } else if (this.driftCounter >= 2) {
            // L2 — heavier overlay
            level = 2;
            messageTemplate = INTERVENTION_MESSAGES.L2[this.mode];
            type = 'OVERLAY';
        } else {
            // L1 — gentle nudge
            level = 1;
            messageTemplate = INTERVENTION_MESSAGES.L1[this.mode];
            type = this.mode === 'gentle' ? 'TOAST' : 'OVERLAY';
        }

        const message = messageTemplate
            .replace(/\[appName\]/g, appName)
            .replace(/\[countdown\]/g, String(cfg.countdownSecs));

        return {
            level,
            type,
            message,
            mode: this.mode,
            appName,
            activityType,
            blurPx: cfg.blurLevels[Math.min(level - 1, 2)],
            bgOpacity: cfg.bgOpacity,
            countdownSecs: level >= 3 ? cfg.countdownSecs : 0,
            buttonDelay: cfg.buttonDelay,
            position: cfg.position,
            creditsEnabled: cfg.creditsEnabled,
        };
    }

    /**
     * Handle force-close flow. Called when L3 is reached.
     * Starts a countdown in the main process and emits events.
     * @param {string} appName
     * @param {string} processName
     */
    handleForceClose(appName, processName) {
        try {
            const cfg = this.getModeConfig();
            if (cfg.forceAction === 'none') return;

            this._pendingForceClose = { appName, processName };
            this._countdownRemaining = cfg.countdownSecs;

            this.emit('intervention:warning', {
                appName,
                processName,
                countdown: this._countdownRemaining,
                mode: this.mode,
            });

            this._countdownTimer = setInterval(() => {
                this._countdownRemaining--;
                this.emit('intervention:countdown:tick', {
                    remaining: this._countdownRemaining,
                });

                if (this._countdownRemaining <= 0) {
                    this._clearCountdown();
                    this._executeForceClose(appName, processName, cfg.forceAction);
                }
            }, 1000);

            console.log(`[intervention] Force-close countdown started: ${cfg.countdownSecs}s for ${appName}`);
        } catch (err) {
            console.error('[intervention] handleForceClose failed:', err.message);
        }
    }

    /**
     * Cancel the force-close countdown (user self-corrected).
     */
    cancelForceClose() {
        try {
            this._clearCountdown();
            this._pendingForceClose = null;
            console.log('[intervention] Force-close cancelled (self-correction)');
        } catch (err) {
            console.error('[intervention] cancelForceClose failed:', err.message);
        }
    }

    /**
     * @private
     */
    _clearCountdown() {
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
    }

    /**
     * Execute the force-close or minimize action.
     * @param {string} appName
     * @param {string} processName
     * @param {'minimize'|'kill'} action
     * @private
     */
    _executeForceClose(appName, processName, action) {
        try {
            const isWindows = process.platform === 'win32';

            if (action === 'kill') {
                // STRICT MODE: force kill the process
                const cmd = isWindows
                    ? `taskkill /IM "${processName}" /F`
                    : `pkill -x "${appName}"`;

                exec(cmd, { timeout: 5000 }, (err) => {
                    if (err) {
                        // Process may already be closed — treat as self-correction
                        console.warn(`[intervention] Force kill failed (may already be closed): ${err.message}`);
                    }
                    this.emit('intervention:forceClosed', { appName, processName, action: 'kill' });
                    console.log(`[intervention] Force killed: ${processName}`);
                });
            } else {
                // BALANCED MODE: minimize only
                const cmd = isWindows
                    ? `powershell -NoProfile -Command "Get-Process -Name '${processName.replace('.exe', '')}' -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }"`
                    : `osascript -e 'tell application "${appName}" to set miniaturized of every window to true'`;

                exec(cmd, { timeout: 5000 }, (err) => {
                    if (err) {
                        console.warn(`[intervention] Minimize failed: ${err.message}`);
                    }
                    this.emit('intervention:forceClosed', { appName, processName, action: 'minimize' });
                    console.log(`[intervention] Minimized: ${processName}`);
                });
            }

            this._pendingForceClose = null;
        } catch (err) {
            console.error('[intervention] _executeForceClose failed:', err.message);
        }
    }

    /**
     * Get the current FSM state.
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * User acknowledges the intervention.
     */
    acknowledge() {
        try {
            this.driftCounter = 0;
            this.focusCounter = 0;
            this.state = STATES.MONITORING;
            this.cancelForceClose();
            console.log('[intervention] User acknowledged — back to MONITORING');
        } catch (err) {
            console.error('[intervention] acknowledge failed:', err.message);
        }
    }

    /**
     * Full reset to IDLE state.
     */
    reset() {
        try {
            this.state = STATES.IDLE;
            this.driftCounter = 0;
            this.focusCounter = 0;
            this.cancelForceClose();
            console.log('[intervention] Reset to IDLE');
        } catch (err) {
            console.error('[intervention] reset failed:', err.message);
        }
    }

    /**
     * Update settings.
     * @param {object} newSettings
     */
    updateSettings(newSettings) {
        try {
            if (newSettings && typeof newSettings === 'object') {
                this.settings = { ...this.settings, ...newSettings };
            }
        } catch (err) {
            console.error('[intervention] updateSettings failed:', err.message);
        }
    }

    /**
     * Get the current drift counter.
     * @returns {number}
     */
    getDriftCounter() {
        return this.driftCounter;
    }
}

module.exports = new InterventionEngine();
