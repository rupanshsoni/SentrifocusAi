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
const { ProcessScanner } = require('./processScanner');
const { WindowWatcher } = require('./windowWatcher');

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

        // Layer 1 & 2 detectors
        this._processScanner = new ProcessScanner();
        this._windowWatcher = new WindowWatcher();
        this._lastLayerScore = null;       // last score from Layer 1/2 (bypasses Gemini)
        this._lastLayerCategory = null;
        this._lastLayerApp = null;
        this._immediateCaptureRequested = false;
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

            // Start Layer 1 & 2 detectors
            this._startDetectors();

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
     * Start Layer 1 (ProcessScanner) and Layer 2 (WindowWatcher) detectors.
     * Wires up all event listeners.
     * @private
     */
    _startDetectors() {
        // --- Layer 1: Process Scanner ---
        this._processScanner.on('instant:distraction', (data) => {
            console.log(`[session] L1 instant distraction: ${data.displayName}`);
            this._handleInstantDetection(data.score, data.category, data.displayName, 100);
        });

        this._processScanner.on('instant:focus', (data) => {
            console.log(`[session] L1 instant focus: ${data.displayName}`);
            this._handleInstantDetection(data.score, 'FOCUS', data.displayName, 95);
        });

        this._processScanner.on('soft:flag', (data) => {
            // Store for fusion — the main loop will pick this up
            this._lastLayerScore = data.score;
            this._lastLayerCategory = data.category;
            this._lastLayerApp = data.displayName;
        });

        this._processScanner.start(this.taskText);

        // --- Layer 2: Window Watcher ---
        this._windowWatcher.on('window:changed', () => {
            // Any window switch → trigger immediate screenshot in the main loop
            this._immediateCaptureRequested = true;
        });

        this._windowWatcher.on('window:distraction:instant', (data) => {
            console.log(`[session] L2 instant distraction: ${data.label}`);
            this._handleInstantDetection(data.score, data.category, data.label, 95);
        });

        this._windowWatcher.on('window:distraction:soft', (data) => {
            this._lastLayerScore = data.score;
            this._lastLayerCategory = data.category;
            this._lastLayerApp = data.label;
        });

        this._windowWatcher.on('window:focus', (data) => {
            console.log(`[session] L2 focus detected: ${data.label}`);
            this._handleInstantDetection(data.score, 'FOCUS', data.label, 90);
        });

        this._windowWatcher.on('window:ambiguous', () => {
            // Ambiguous content (YouTube etc.) → force immediate screenshot for Gemini
            this._lastLayerScore = null; // clear — let Gemini decide
            this._immediateCaptureRequested = true;
        });

        this._windowWatcher.start(this.taskText);
    }

    /**
     * Handle an instant detection from Layer 1 or Layer 2.
     * Bypasses the Gemini API entirely for confident scores.
     * @param {number} score - Relevance score 0-100
     * @param {string} category - Activity category
     * @param {string} appName - Display name of the app/site
     * @param {number} confidence - Detection confidence
     * @private
     */
    _handleInstantDetection(score, category, appName, confidence) {
        try {
            if (!this.sessionActive) return;

            // Map category to activity_type for the intervention FSM
            let activityType = category;
            if (category === 'GAMING') activityType = 'GAMING';
            else if (category === 'SOCIAL_MEDIA' || category === 'SOCIAL') activityType = 'SOCIAL_MEDIA';
            else if (category === 'VIDEO_DISTRACTION') activityType = 'VIDEO_DISTRACTION';
            else if (category === 'BROWSE_DISTRACTION') activityType = 'BROWSE_DISTRACTION';
            else if (category === 'FOCUS') activityType = 'STUDY';

            // Feed into intervention FSM
            const action = intervention.processScore(score, activityType, confidence);

            // Log to database
            db.logActivity(this.sessionId, {
                timestamp: Date.now(),
                activity_type: activityType,
                app_name: appName,
                relevance_score: score,
                confidence: confidence,
                intervention_level: action ? action.level : 0,
            });

            // Dispatch action or award credits
            if (action) {
                this.interventionsCount++;
                this._dispatchAction(action);
            } else if (score >= 70) {
                this._checkFocusCredits();
            }

            // Emit session update to renderer
            this.emit('sessionUpdate', {
                score: score,
                activityType: activityType,
                appName: appName,
                pageContext: `${appName} detected by instant layer`,
                returnPrompt: score < 50 ? `Get back to: ${this.taskText}` : '',
                credits: db.getCreditsBalance(),
                interventionLevel: action ? action.level : 0,
                state: intervention.getState(),
                focusSeconds: this.focusSeconds,
                elapsed: Date.now() - this.startTime,
            });

            // Send focus score to Chrome extension
            wsServer.sendCommand({
                type: 'FOCUS_SCORE',
                score: score,
                task: this.taskText,
            });
        } catch (err) {
            console.error('[session] _handleInstantDetection failed:', err.message);
        }
    }

    /**
     * Main monitoring loop — runs while the session is active.
     * Layer 3: Screenshot + OCR + Gemini AI for ambiguous content.
     * Skips Gemini when Layer 1/2 already gave a confident score.
     */
    async _runLoop() {
        let isFirstCapture = true;
        while (this.sessionActive) {
            try {
                // First capture is immediate; subsequent ones wait unless an immediate trigger fired
                if (!isFirstCapture) {
                    if (this._immediateCaptureRequested) {
                        // Window switch detected by Layer 2 — capture now with minimal delay
                        this._immediateCaptureRequested = false;
                        await this._sleep(500); // tiny delay to let the new window render
                    } else {
                        const interval = inputMonitor.getScreenshotInterval();
                        await this._sleep(interval);
                    }
                }
                isFirstCapture = false;

                if (!this.sessionActive) break;

                // If Layer 1/2 already gave a confident score, skip the expensive AI call
                if (this._lastLayerScore !== null && (this._lastLayerScore >= 70 || this._lastLayerScore <= 30)) {
                    // Already handled by _handleInstantDetection — reset and wait
                    this._lastLayerScore = null;
                    continue;
                }

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

            // Stop Layer 1 & 2 detectors
            this._processScanner.stop();
            this._processScanner.removeAllListeners();
            this._windowWatcher.stop();
            this._windowWatcher.removeAllListeners();
            this._lastLayerScore = null;
            this._lastLayerCategory = null;
            this._lastLayerApp = null;
            this._immediateCaptureRequested = false;

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
