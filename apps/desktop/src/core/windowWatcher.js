'use strict';

const { EventEmitter } = require('events');
const rulesets = require('./rulesets');

// Try to load @paymoapp/active-window; graceful fallback if unavailable
let ActiveWindow = null;
try {
    ActiveWindow = require('@paymoapp/active-window').ActiveWindow;
} catch (err) {
    console.warn('[windowWatcher] @paymoapp/active-window not available:', err.message);
}

/**
 * CognitionX — Layer 2: Active Window Watcher
 *
 * Polls the foreground window every 1 second. Detects app/tab switches
 * and matches against rulesets for instant scoring. Emits events used
 * by the session manager to trigger immediate screenshots or bypass
 * the AI pipeline entirely.
 *
 * Latency: ~1 second from window switch to detection.
 */
class WindowWatcher extends EventEmitter {
    constructor() {
        super();
        this._interval = null;
        this._lastWindow = null;
        this._lastTitle = '';
        this._lastApp = '';
        this._titleUnchangedSince = 0;
        this._sessionTask = '';
    }

    /**
     * Start watching the active window.
     * @param {string} sessionTask - The user's declared focus task
     */
    start(sessionTask) {
        try {
            if (this._interval) return;
            if (!ActiveWindow) {
                console.warn('[windowWatcher] Cannot start — active-window module not loaded');
                return;
            }

            this._sessionTask = sessionTask || '';
            this._lastWindow = null;
            this._lastTitle = '';
            this._lastApp = '';
            this._titleUnchangedSince = Date.now();

            // Fire first check immediately
            this._poll();
            this._interval = setInterval(() => this._poll(), 1000);
            console.log('[windowWatcher] Started');
        } catch (err) {
            console.error('[windowWatcher] start failed:', err.message);
        }
    }

    /**
     * Stop watching.
     */
    stop() {
        try {
            if (this._interval) {
                clearInterval(this._interval);
                this._interval = null;
            }
            this._lastWindow = null;
            this._lastTitle = '';
            this._lastApp = '';
            console.log('[windowWatcher] Stopped');
        } catch (err) {
            console.error('[windowWatcher] stop failed:', err.message);
        }
    }

    /**
     * Get the last known active window info.
     * @returns {{ title: string, application: string, score: number | null } | null}
     */
    getLastWindow() {
        return this._lastWindow;
    }

    /**
     * Poll the active window once.
     * @private
     */
    _poll() {
        try {
            if (!ActiveWindow) return;

            const win = ActiveWindow.getActiveWindow();
            if (!win) return;

            const title = (win.title || '').toLowerCase();
            const application = (win.application || win.name || '').toLowerCase();

            // Detect window change
            const appChanged = application !== this._lastApp;
            const titleChanged = title !== this._lastTitle;

            if (appChanged || titleChanged) {
                // Title changed — reset unchanged timer
                this._titleUnchangedSince = Date.now();

                const evaluation = this._evaluate(title, application);
                const windowInfo = {
                    title: win.title || '',
                    application: win.application || win.name || '',
                    score: evaluation ? evaluation.score : null,
                };
                this._lastWindow = windowInfo;

                // Always emit window:changed for screenshot trigger
                this.emit('window:changed', {
                    from: { title: this._lastTitle, application: this._lastApp },
                    to: windowInfo,
                });

                // Emit specific detection events
                if (evaluation) {
                    this._emitDetection(evaluation, windowInfo);
                }

                this._lastTitle = title;
                this._lastApp = application;
            } else {
                // Title unchanged — check if user is reading (>30s same title)
                const unchangedMs = Date.now() - this._titleUnchangedSince;
                if (unchangedMs > 30000) {
                    // User has been on the same window for 30s+ → reading mode
                    // Don't emit repeatedly, just once
                    if (unchangedMs < 32000) {
                        this.emit('window:reading', {
                            title: win.title || '',
                            application: win.application || win.name || '',
                            durationMs: unchangedMs,
                        });
                    }
                }
            }
        } catch (err) {
            // Silent fail — never crash the main process
            console.warn('[windowWatcher] _poll error:', err.message);
        }
    }

    /**
     * Evaluate the current window against rulesets.
     * @param {string} title - Lowercase window title
     * @param {string} application - Lowercase application name
     * @returns {{ score: number, category: string, label: string, source: string } | null}
     * @private
     */
    _evaluate(title, application) {
        try {
            // 1. Check if it's a browser
            if (rulesets.isBrowser(application)) {
                // Match the browser tab title against BROWSER_TITLE_RULES
                const titleMatch = rulesets.matchBrowserTitle(title);
                if (titleMatch) {
                    return { ...titleMatch, source: 'browser_title' };
                }
                // No title match → unknown browser content → needs Gemini
                return { score: -1, category: 'BROWSE_UNKNOWN', label: 'Unknown browser tab', source: 'browser_unknown' };
            }

            // 2. Non-browser app → check PROCESS_RULES by application name
            const processMatch = rulesets.matchProcess(application);
            if (processMatch) {
                return {
                    score: processMatch.score,
                    category: processMatch.category,
                    label: processMatch.displayName,
                    source: 'process_rule',
                };
            }

            // 3. Try matching the exe name from the application field
            // Sometimes application is like "code" not "code.exe"
            const withExe = application.endsWith('.exe') ? application : application + '.exe';
            const exeMatch = rulesets.matchProcess(withExe);
            if (exeMatch) {
                return {
                    score: exeMatch.score,
                    category: exeMatch.category,
                    label: exeMatch.displayName,
                    source: 'process_rule',
                };
            }

            // 4. Unknown app → needs Gemini
            return null;
        } catch (err) {
            console.warn('[windowWatcher] _evaluate error:', err.message);
            return null;
        }
    }

    /**
     * Emit the appropriate detection event based on the evaluation score.
     * @param {{ score: number, category: string, label: string, source: string }} evaluation
     * @param {{ title: string, application: string, score: number | null }} windowInfo
     * @private
     */
    _emitDetection(evaluation, windowInfo) {
        try {
            const data = {
                title: windowInfo.title,
                application: windowInfo.application,
                score: evaluation.score,
                category: evaluation.category,
                label: evaluation.label,
                source: evaluation.source,
            };

            if (evaluation.score === -1) {
                // Ambiguous — needs Gemini (e.g. YouTube, Twitch)
                this.emit('window:ambiguous', data);
                console.log(`[windowWatcher] AMBIGUOUS: ${evaluation.label} — "${windowInfo.title}"`);
            } else if (evaluation.score === 0) {
                // Instant distraction
                this.emit('window:distraction:instant', data);
                console.log(`[windowWatcher] INSTANT distraction: ${evaluation.label}`);
            } else if (evaluation.score > 0 && evaluation.score <= 40) {
                // Soft distraction
                this.emit('window:distraction:soft', data);
                console.log(`[windowWatcher] Soft distraction: ${evaluation.label} (score: ${evaluation.score})`);
            } else if (evaluation.score >= 70) {
                // Focus app/site
                this.emit('window:focus', data);
                console.log(`[windowWatcher] FOCUS: ${evaluation.label} (score: ${evaluation.score})`);
            } else {
                // Middle range (41-69) → ambiguous
                this.emit('window:ambiguous', data);
                console.log(`[windowWatcher] Ambiguous range: ${evaluation.label} (score: ${evaluation.score})`);
            }
        } catch (err) {
            console.warn('[windowWatcher] _emitDetection error:', err.message);
        }
    }
}

module.exports = { WindowWatcher };
