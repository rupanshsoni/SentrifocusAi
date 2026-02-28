'use strict';

const { EventEmitter } = require('events');
const { exec } = require('child_process');
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
const rulesets = require('./rulesets');

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

        // Streak & distraction tracking
        this.currentStreakSecs = 0;
        this.lastStreakCheckTime = null;
        this.distractionCount = 0;
        this.totalDistractedSecs = 0;
        this._lastDistractionStartTime = null;
        this._interventionShownAt = null;   // timestamp when overlay was shown

        // Layer 1 & 2 detectors
        this._processScanner = new ProcessScanner();
        this._windowWatcher = new WindowWatcher();
        this._lastLayerScore = null;       // last score from Layer 1/2 (bypasses Gemini)
        this._lastLayerCategory = null;
        this._lastLayerApp = null;
        this._immediateCaptureRequested = false;

        // Wire up intervention engine events
        this._wireInterventionEvents();
    }

    /**
     * Wire up events from the intervention engine (countdown ticks, force-close, etc.)
     * @private
     */
    _wireInterventionEvents() {
        intervention.on('intervention:warning', (data) => {
            this.emit('intervention:show', {
                ...data,
                level: 3,
                streakSecs: this.currentStreakSecs,
                distractionCount: this.distractionCount,
                task: this.taskText,
            });
        });

        intervention.on('intervention:countdown:tick', (data) => {
            this.emit('intervention:countdown', data);
        });

        intervention.on('intervention:forceClosed', (data) => {
            this.emit('intervention:forceClosed', data);
            this.emit('intervention:hide', {});
            // Log the force close
            db.logActivity(this.sessionId, {
                timestamp: Date.now(),
                activity_type: 'FORCE_CLOSED',
                app_name: data.appName,
                relevance_score: 0,
                confidence: 100,
                intervention_level: 5,
                distraction_type: `FORCE_${data.action.toUpperCase()}`,
            });
        });
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
            this.currentStreakSecs = 0;
            this.lastStreakCheckTime = Date.now();
            this.distractionCount = 0;
            this.totalDistractedSecs = 0;
            this._lastDistractionStartTime = null;
            this._interventionShownAt = null;

            // Load mode from database
            const savedMode = db.getSetting('intervention_mode') || 'balanced';
            intervention.setMode(savedMode);

            inputMonitor.startMonitoring();
            intervention.reset();

            // Start streak tracking timer
            this._startStreakTimer();

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
        console.log('[session] _startDetectors() — wiring Layer 1 & 2 event listeners...');

        // --- Layer 1: Process Scanner ---
        this._processScanner.on('instant:distraction', (data) => {
            console.log(`[session] L1 EVENT received: instant:distraction — ${data.displayName} (score: ${data.score})`);
            this._handleInstantDetection(data.score, data.category, data.displayName, 100);
        });

        this._processScanner.on('instant:focus', (data) => {
            console.log(`[session] L1 EVENT received: instant:focus — ${data.displayName} (score: ${data.score})`);
            this._handleInstantDetection(data.score, 'FOCUS', data.displayName, 95);
        });

        this._processScanner.on('soft:flag', (data) => {
            console.log(`[session] L1 EVENT received: soft:flag — ${data.displayName} (score: ${data.score})`);
            // Store for fusion — the main loop will pick this up
            this._lastLayerScore = data.score;
            this._lastLayerCategory = data.category;
            this._lastLayerApp = data.displayName;
        });

        console.log('[session] ✓ L1 listeners attached, calling processScanner.start()');
        this._processScanner.start(this.taskText);

        // --- Layer 2: Window Watcher ---
        this._windowWatcher.on('window:changed', (data) => {
            console.log(`[session] L2 EVENT received: window:changed — to: "${data.to.title.substring(0, 60)}" (${data.to.application})`);
            // Any window switch → trigger immediate screenshot in the main loop
            this._immediateCaptureRequested = true;
        });

        this._windowWatcher.on('window:distraction:instant', (data) => {
            console.log(`[session] L2 EVENT received: window:distraction:instant — ${data.label} (score: ${data.score})`);
            this._handleInstantDetection(data.score, data.category, data.label, 95);
        });

        this._windowWatcher.on('window:distraction:soft', (data) => {
            console.log(`[session] L2 EVENT received: window:distraction:soft — ${data.label} (score: ${data.score})`);
            this._lastLayerScore = data.score;
            this._lastLayerCategory = data.category;
            this._lastLayerApp = data.label;
        });

        this._windowWatcher.on('window:focus', (data) => {
            console.log(`[session] L2 EVENT received: window:focus — ${data.label} (score: ${data.score})`);
            this._handleInstantDetection(data.score, 'FOCUS', data.label, 90);
        });

        this._windowWatcher.on('window:ambiguous', (data) => {
            console.log(`[session] L2 EVENT received: window:ambiguous — ${data.label} (score: ${data.score})`);
            // Ambiguous content (YouTube etc.) → force immediate screenshot for Gemini
            this._lastLayerScore = null; // clear — let Gemini decide
            this._immediateCaptureRequested = true;
        });

        console.log('[session] ✓ L2 listeners attached, calling windowWatcher.start()');
        this._windowWatcher.start(this.taskText);
        console.log('[session] ✓ Both detectors started');
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
            const action = intervention.processScore(score, activityType, confidence, appName);

            // Log to database
            db.logActivity(this.sessionId, {
                timestamp: Date.now(),
                activity_type: activityType,
                app_name: appName,
                relevance_score: score,
                confidence: confidence,
                intervention_level: action ? action.level : 0,
            });

            // Track distraction / streak
            if (score < 70) {
                this._onDistraction(appName);
            } else {
                this._onFocusRestore();
            }

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
                streakSecs: this.currentStreakSecs,
                distractionCount: this.distractionCount,
                elapsed: Date.now() - this.startTime,
                mode: intervention.getMode(),
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
     * Start a timer that increments currentStreakSecs every second while focused.
     * @private
     */
    _startStreakTimer() {
        this._streakInterval = setInterval(() => {
            if (!this.sessionActive) return;
            if (intervention.getState() === 'MONITORING' || intervention.getState() === 'IDLE') {
                this.currentStreakSecs++;
            }
        }, 1000);
    }

    /**
     * Called on every distraction detection.
     * @param {string} appName
     * @private
     */
    _onDistraction(appName) {
        // Only count as a new distraction if we were previously focused
        if (this._lastDistractionStartTime === null) {
            this.distractionCount++;
            this._lastDistractionStartTime = Date.now();
        }
        // Reset streak
        this.currentStreakSecs = 0;
    }

    /**
     * Called when focus is restored.
     * @private
     */
    _onFocusRestore() {
        if (this._lastDistractionStartTime !== null) {
            const distractedMs = Date.now() - this._lastDistractionStartTime;
            this.totalDistractedSecs += Math.floor(distractedMs / 1000);
            this._lastDistractionStartTime = null;
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
                    analysis.confidence,
                    analysis.app_name
                );

                // Track distraction / streak
                if (analysis.relevance_score < 70) {
                    this._onDistraction(analysis.app_name);
                } else {
                    this._onFocusRestore();
                }

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
                    streakSecs: this.currentStreakSecs,
                    distractionCount: this.distractionCount,
                    elapsed: Date.now() - this.startTime,
                    mode: intervention.getMode(),
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
     * @param {object} action - mode-aware action from InterventionEngine
     */
    _dispatchAction(action) {
        try {
            this._interventionShownAt = Date.now();

            switch (action.type) {
                case 'TOAST':
                    notifier.notify({
                        title: 'CognitionX',
                        message: action.message,
                        icon: undefined,
                        timeout: 8,
                    });
                    // Also emit to renderer for gentle overlay
                    this.emit('intervention:show', {
                        level: action.level,
                        mode: action.mode,
                        appName: action.appName,
                        message: action.message,
                        streakSecs: this.currentStreakSecs,
                        distractionCount: this.distractionCount,
                        countdownSecs: 0,
                        blurPx: action.blurPx,
                        bgOpacity: action.bgOpacity,
                        buttonDelay: action.buttonDelay,
                        position: action.position,
                        creditsEnabled: action.creditsEnabled,
                        task: this.taskText,
                    });
                    break;

                case 'OVERLAY':
                    this.emit('intervention:show', {
                        level: action.level,
                        mode: action.mode,
                        appName: action.appName,
                        message: action.message,
                        streakSecs: this.currentStreakSecs,
                        distractionCount: this.distractionCount,
                        countdownSecs: action.countdownSecs || 0,
                        blurPx: action.blurPx,
                        bgOpacity: action.bgOpacity,
                        buttonDelay: action.buttonDelay,
                        position: action.position,
                        creditsEnabled: action.creditsEnabled,
                        task: this.taskText,
                    });
                    break;

                case 'FORCE_CLOSE_WARNING':
                    this.emit('intervention:show', {
                        level: action.level,
                        mode: action.mode,
                        appName: action.appName,
                        message: action.message,
                        streakSecs: this.currentStreakSecs,
                        distractionCount: this.distractionCount,
                        countdownSecs: action.countdownSecs,
                        blurPx: action.blurPx,
                        bgOpacity: action.bgOpacity,
                        buttonDelay: action.buttonDelay,
                        position: action.position,
                        creditsEnabled: action.creditsEnabled,
                        task: this.taskText,
                    });
                    // Start the main-process force-close countdown
                    const processName = action.appName ? `${action.appName}.exe` : '';
                    intervention.handleForceClose(action.appName, processName);
                    break;

                case 'MEDIA_PAUSE':
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

            this.emit('intervention', { level: action.level, type: action.type, message: action.message, mode: action.mode });
            console.log(`[session] Dispatched L${action.level} intervention: ${action.type} (${action.mode} mode)`);
        } catch (err) {
            console.error('[session] _dispatchAction failed:', err.message);
        }
    }

    /**
     * Handle self-correction: user clicked "I'm Back" quickly.
     * Awards bonus credits if within 15 seconds.
     * @returns {{bonus: number, balance: number}|null}
     */
    handleSelfCorrection() {
        try {
            let bonus = 0;
            const elapsed = this._interventionShownAt
                ? (Date.now() - this._interventionShownAt) / 1000
                : 999;

            if (elapsed <= 15) {
                bonus = 5;
                const newBalance = db.mutateCredits(5, 'self_correction');
                this.creditsEarned += 5;
                this.emit('creditUpdate', { balance: newBalance, earned: 5, reason: 'self_correction' });
                console.log('[session] Self-correction bonus awarded: +5 credits');
            }

            // Acknowledge the intervention
            intervention.acknowledge();
            wsServer.sendCommand({ type: 'CLEAR' });
            this.emit('intervention:hide', {});
            this._interventionShownAt = null;
            this._onFocusRestore();

            return { bonus, balance: db.getCreditsBalance() };
        } catch (err) {
            console.error('[session] handleSelfCorrection failed:', err.message);
            return null;
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

            // Stop streak timer
            if (this._streakInterval) {
                clearInterval(this._streakInterval);
                this._streakInterval = null;
            }

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
                distractionCount: this.distractionCount,
                totalDistractedSecs: this.totalDistractedSecs,
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
            this.currentStreakSecs = 0;
            this.distractionCount = 0;
            this.totalDistractedSecs = 0;

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

// ─── STEP 5: Test Detection Diagnostics ─────────────────────────────────────
// Runs once 3 seconds after module loads (i.e. after app ready).
// Prints what the scanner and watcher actually see.

function testDetection() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('[testDetection] Running Layer 1 & 2 detection diagnostics...');
    console.log('══════════════════════════════════════════════════════');

    // --- Part A: Tasklist (first 20 processes) ---
    const isWindows = process.platform === 'win32';
    if (isWindows) {
        exec('tasklist /FO CSV /NH', { timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout) => {
            if (err) {
                console.error('[testDetection] tasklist error:', err.message);
            } else {
                const lines = stdout.split('\n').slice(0, 20);
                const names = lines.map(l => {
                    const m = l.trim().match(/^"([^"]+)"/);
                    return m ? m[1].toLowerCase() : null;
                }).filter(Boolean);
                console.log('[testDetection] tasklist first 20:', names.join(', '));

                // Check which ones match rules
                const matches = names.filter(n => rulesets.matchProcess(n));
                console.log('[testDetection] tasklist rule matches:', matches.length > 0 ? matches.join(', ') : '(none)');
            }
        });

        // --- Part B: Get-Process (catches Store apps) ---
        exec('powershell -NoProfile -Command "Get-Process | Select-Object -ExpandProperty Name -Unique | Sort-Object"',
            { timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout) => {
                if (err) {
                    console.error('[testDetection] Get-Process error:', err.message);
                } else {
                    const names = stdout.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
                    console.log(`[testDetection] Get-Process unique processes: ${names.length}`);
                    // Check for known distractions/focus
                    const matchedPs = names.filter(n =>
                        rulesets.matchProcess(n) || rulesets.matchProcess(n + '.exe')
                    );
                    console.log('[testDetection] Get-Process rule matches:', matchedPs.length > 0 ? matchedPs.join(', ') : '(none)');

                    // Specifically look for Store app names
                    const storeApps = names.filter(n =>
                        n.includes('whatsapp') || n.includes('discord') || n.includes('telegram') ||
                        n.includes('spotify') || n.includes('xbox') || n.includes('minecraft') ||
                        n.includes('applicationframehost')
                    );
                    if (storeApps.length > 0) {
                        console.log('[testDetection] Store/UWP apps detected via Get-Process:', storeApps.join(', '));
                    } else {
                        console.log('[testDetection] No known Store/UWP apps found via Get-Process');
                    }
                }
            });
    }

    // --- Part C: Active Window raw output ---
    try {
        const { ActiveWindow } = require('@paymoapp/active-window');
        const win = ActiveWindow.getActiveWindow();
        if (win) {
            console.log('[testDetection] ActiveWindow raw:', JSON.stringify({
                title: (win.title || '').substring(0, 100),
                application: win.application || '',
                name: win.name || '',
                path: (win.path || '').substring(0, 120),
                pid: win.pid || 0,
                isUWPApp: win.isUWPApp,
                uwpPackage: win.uwpPackage || '',
            }));

            // Test evaluation
            const title = (win.title || '').toLowerCase();
            const app = (win.application || win.name || '').toLowerCase();
            console.log(`[testDetection] isBrowser("${app}"): ${rulesets.isBrowser(app)}`);
            console.log(`[testDetection] matchProcess("${app}"): ${JSON.stringify(rulesets.matchProcess(app))}`);
            console.log(`[testDetection] matchProcess("${app}.exe"): ${JSON.stringify(rulesets.matchProcess(app + '.exe'))}`);
            console.log(`[testDetection] matchTitleFallback("${title.substring(0, 60)}"): ${JSON.stringify(rulesets.matchTitleFallback(title))}`);
            console.log(`[testDetection] matchBrowserTitle("${title.substring(0, 60)}"): ${JSON.stringify(rulesets.matchBrowserTitle(title))}`);
        } else {
            console.warn('[testDetection] ActiveWindow.getActiveWindow() returned null');
        }
    } catch (err) {
        console.error('[testDetection] ActiveWindow error:', err.message);
    }

    console.log('══════════════════════════════════════════════════════\n');
}

// Schedule test 3 seconds after module load
setTimeout(testDetection, 3000);

module.exports = new SessionManager();
