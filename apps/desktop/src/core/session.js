'use strict';

const { EventEmitter } = require('events');
const screenshot = require('./screenshot');
const inputMonitor = require('./inputMonitor');
const ocr = require('./ocr');
const gemini = require('./gemini');
const intervention = require('./intervention');
const wsServer = require('./wsServer');
const db = require('../db/database');
const notifier = require('node-notifier');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.sessionActive = false;
        this.sessionId = null;
        this.taskText = '';
        this.history = []; // last 3 page_context strings
        this.startTime = null;
        this.focusSeconds = 0;
        this.creditsEarned = 0;
        this.interventionsCount = 0;
        this.lastFocusBlockTime = null;
    }

    /**
     * Start a new focus session.
     * @param {string} taskText - User's declared focus task
     * @param {number} [durationMs] - Optional session duration in ms
     */
    async startSession(taskText, durationMs) {
        try {
            if (this.sessionActive) {
                console.warn('[session] Session already active');
                return null;
            }

            if (typeof taskText !== 'string' || taskText.trim().length === 0) {
                console.error('[session] Invalid task text');
                return null;
            }
            if (taskText.length > 200) {
                taskText = taskText.substring(0, 200);
            }

            this.taskText = taskText.trim();
            this.sessionId = db.createSession(this.taskText);
            this.sessionActive = true;
            this.startTime = Date.now();
            this.history = [];
            this.focusSeconds = 0;
            this.creditsEarned = 0;
            this.interventionsCount = 0;
            this.lastFocusBlockTime = Date.now();

            inputMonitor.startMonitoring();
            intervention.reset();

            console.log('[session] Session started:', this.taskText);
            this.emit('sessionStarted', { sessionId: this.sessionId, task: this.taskText });

            // Start the main loop
            this._runLoop();

            return { sessionId: this.sessionId, task: this.taskText };
        } catch (err) {
            console.error('[session] startSession failed:', err.message);
            return null;
        }
    }

    /**
     * Main monitoring loop — runs while the session is active.
     */
    async _runLoop() {
        while (this.sessionActive) {
            try {
                const interval = inputMonitor.getScreenshotInterval();

                // If idle, wait and continue
                if (interval === null) {
                    await this._sleep(5000);
                    continue;
                }

                await this._sleep(interval);

                if (!this.sessionActive) break;

                // Capture screenshot
                const screenshotBase64 = await screenshot.captureScreen();
                if (!screenshotBase64) continue;

                // Try OCR first
                let analysis = null;
                const ocrResult = await ocr.extractText(screenshotBase64);

                if (ocr.isSufficient(ocrResult)) {
                    analysis = await gemini.analyzeText(ocrResult.text, this.taskText);
                } else {
                    analysis = await gemini.analyzeScreenshot(screenshotBase64, this.taskText, this.history);
                }

                // If analysis failed (API error, timeout, etc.), skip this interval
                if (!analysis) continue;

                // Process through intervention engine
                const action = intervention.processScore(
                    analysis.relevance_score,
                    analysis.activity_type,
                    analysis.confidence
                );

                // Log to database
                db.logActivity(this.sessionId, {
                    timestamp: Date.now(),
                    activity_type: analysis.activity_type,
                    app_name: analysis.app_name,
                    relevance_score: analysis.relevance_score,
                    confidence: analysis.confidence,
                    intervention_level: action ? action.level : 0,
                });

                // Dispatch action or award credits
                if (action) {
                    this.interventionsCount++;
                    this._dispatchAction(action);
                } else {
                    // User is focused — check for credit awards
                    this._checkFocusCredits();
                }

                // Update history (keep last 3)
                if (analysis.page_context) {
                    this.history.push(analysis.page_context);
                    if (this.history.length > 3) {
                        this.history.shift();
                    }
                }

                // Emit session update to renderer
                this.emit('sessionUpdate', {
                    score: analysis.relevance_score,
                    activityType: analysis.activity_type,
                    appName: analysis.app_name,
                    pageContext: analysis.page_context,
                    returnPrompt: analysis.return_prompt,
                    credits: db.getCreditsBalance(),
                    interventionLevel: action ? action.level : 0,
                    state: intervention.getState(),
                    focusSeconds: this.focusSeconds,
                    elapsed: Date.now() - this.startTime,
                });

                // Send focus score to Chrome extension popup
                wsServer.sendCommand({
                    type: 'FOCUS_SCORE',
                    score: analysis.relevance_score,
                    task: this.taskText,
                });
            } catch (err) {
                console.error('[session] Loop error:', err.message);
                await this._sleep(5000);
            }
        }
    }

    /**
     * Check if the user has earned a 5-minute focus block credit.
     */
    _checkFocusCredits() {
        try {
            const now = Date.now();
            const fiveMinMs = 5 * 60 * 1000;

            if (now - this.lastFocusBlockTime >= fiveMinMs) {
                const newBalance = db.mutateCredits(10, 'focus_block');
                this.creditsEarned += 10;
                this.lastFocusBlockTime = now;
                this.focusSeconds += 300; // 5 minutes

                this.emit('creditUpdate', { balance: newBalance, earned: 10, reason: 'focus_block' });
                console.log('[session] Awarded 10 credits for 5-min focus block');
            }
        } catch (err) {
            console.error('[session] _checkFocusCredits failed:', err.message);
        }
    }

    /**
     * Dispatch an intervention action.
     * @param {object} action - { level, type, message }
     */
    _dispatchAction(action) {
        try {
            switch (action.type) {
                case 'TOAST':
                    notifier.notify({
                        title: 'CognitionX',
                        message: action.message,
                        icon: undefined,
                        timeout: 8,
                    });
                    break;

                case 'OVERLAY':
                    this.emit('showOverlay', {
                        message: action.message,
                        level: action.level,
                    });
                    break;

                case 'MEDIA_PAUSE':
                    // Emit to main process to send OS media key
                    this.emit('mediaPause');
                    break;

                case 'EXTENSION_COMMAND':
                    wsServer.sendCommand({ type: 'BLUR_TAB' });
                    wsServer.sendCommand({ type: 'MUTE_TAB' });
                    break;

                case 'MINIMISE':
                    this.emit('minimiseApp');
                    break;

                default:
                    console.warn('[session] Unknown action type:', action.type);
            }

            this.emit('intervention', { level: action.level, type: action.type, message: action.message });
            console.log(`[session] Dispatched Level ${action.level} intervention: ${action.type}`);
        } catch (err) {
            console.error('[session] _dispatchAction failed:', err.message);
        }
    }

    /**
     * Stop the current session and return a summary.
     * @returns {object|null} Session summary
     */
    async stopSession() {
        try {
            if (!this.sessionActive) {
                console.warn('[session] No active session to stop');
                return null;
            }

            this.sessionActive = false;
            inputMonitor.stopMonitoring();

            const elapsed = Date.now() - this.startTime;
            const summary = {
                sessionId: this.sessionId,
                task: this.taskText,
                totalSeconds: Math.floor(elapsed / 1000),
                focusSeconds: this.focusSeconds,
                focusPercent: elapsed > 0 ? Math.round((this.focusSeconds / (elapsed / 1000)) * 100) : 0,
                creditsEarned: this.creditsEarned,
                interventionsCount: this.interventionsCount,
                creditsBalance: db.getCreditsBalance(),
            };

            db.endSession(this.sessionId, {
                focusSeconds: this.focusSeconds,
                creditsEarned: this.creditsEarned,
                interventionsCount: this.interventionsCount,
            });

            // Clear extension state
            wsServer.sendCommand({ type: 'CLEAR' });
            intervention.reset();

            this.emit('sessionEnded', summary);
            console.log('[session] Session ended:', summary);

            // Reset internal state
            this.sessionId = null;
            this.taskText = '';
            this.history = [];
            this.startTime = null;

            return summary;
        } catch (err) {
            console.error('[session] stopSession failed:', err.message);
            return null;
        }
    }

    /**
     * Get current session status.
     * @returns {object|null}
     */
    getStatus() {
        if (!this.sessionActive) return null;

        return {
            sessionId: this.sessionId,
            task: this.taskText,
            elapsed: Date.now() - this.startTime,
            focusSeconds: this.focusSeconds,
            creditsEarned: this.creditsEarned,
            interventionsCount: this.interventionsCount,
            credits: db.getCreditsBalance(),
            state: intervention.getState(),
        };
    }

    /**
     * Sleep helper.
     * @param {number} ms
     */
    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = new SessionManager();
