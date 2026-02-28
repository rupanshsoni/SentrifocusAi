'use strict';

const { EventEmitter } = require('events');
const rulesets = require('./rulesets');

// Try to load @paymoapp/active-window; graceful fallback if unavailable
let ActiveWindow = null;
try {
    ActiveWindow = require('@paymoapp/active-window').ActiveWindow;
} catch (err) {
    console.warn('[WindowWatcher] @paymoapp/active-window not available:', err.message);
}

/**
 * CognitionX — Layer 2: Active Window Watcher
 *
 * Polls the foreground window every 1 second. Detects app/tab switches
 * and matches against rulesets for instant scoring. Emits events used
 * by the session manager to trigger immediate screenshots or bypass
 * the AI pipeline entirely.
 *
 * For UWP/Store apps where application field is empty or 'ApplicationFrameHost',
 * falls back to matching against window title via TITLE_FALLBACK_RULES.
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
        this._pollCount = 0;
    }

    /**
     * Start watching the active window.
     * @param {string} sessionTask - The user's declared focus task
     */
    start(sessionTask) {
        try {
            if (this._interval) return;
            if (!ActiveWindow) {
                console.warn('[WindowWatcher] Cannot start — active-window module not loaded');
                return;
            }

            this._sessionTask = sessionTask || '';
            this._lastWindow = null;
            this._lastTitle = '';
            this._lastApp = '';
            this._titleUnchangedSince = Date.now();
            this._pollCount = 0;

            console.log('[WindowWatcher] ✓ start() called — polling active window every 1s');

            // Fire first check immediately
            this._poll();
            this._interval = setInterval(() => this._poll(), 1000);
            console.log('[WindowWatcher] Started');
        } catch (err) {
            console.error('[WindowWatcher] start failed:', err.message);
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
            console.log('[WindowWatcher] Stopped');
        } catch (err) {
            console.error('[WindowWatcher] stop failed:', err.message);
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

            this._pollCount++;
            const win = ActiveWindow.getActiveWindow();
            if (!win) {
                if (this._pollCount <= 3) {
                    console.warn('[WindowWatcher] getActiveWindow() returned null');
                }
                return;
            }

            const title = (win.title || '').toLowerCase();
            const application = (win.application || win.name || '').toLowerCase();
            const rawPath = win.path || '';

            // Extract exe name from path (e.g. "C:\...\Code.exe" → "code.exe")
            const exeFromPath = rawPath ? rawPath.split(/[\\/]/).pop().toLowerCase() : '';

            // Log raw data on first 3 polls and every 30th poll
            if (this._pollCount <= 3 || this._pollCount % 30 === 0) {
                console.log(`[WindowWatcher] Poll #${this._pollCount} raw: { title: "${(win.title || '').substring(0, 80)}", application: "${win.application || win.name || ''}", path: "${rawPath.substring(0, 80)}", exe: "${exeFromPath}" }`);
            }

            // Detect window change
            const appChanged = application !== this._lastApp;
            const titleChanged = title !== this._lastTitle;

            if (appChanged || titleChanged) {
                // Title changed — reset unchanged timer
                this._titleUnchangedSince = Date.now();

                console.log(`[WindowWatcher] Active window changed: app="${application}", exe="${exeFromPath}", title="${title.substring(0, 80)}"`);

                const evaluation = this._evaluate(title, application, exeFromPath);
                const windowInfo = {
                    title: win.title || '',
                    application: win.application || win.name || '',
                    score: evaluation ? evaluation.score : null,
                };
                this._lastWindow = windowInfo;

                if (evaluation) {
                    console.log(`[WindowWatcher] Evaluation: score=${evaluation.score}, category=${evaluation.category}, label=${evaluation.label}, source=${evaluation.source}`);
                } else {
                    console.log(`[WindowWatcher] Evaluation: null (unknown app — needs Gemini)`);
                }

                // Always emit window:changed for screenshot trigger
                console.log(`[WindowWatcher] >>> Emitting window:changed`);
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
            console.warn('[WindowWatcher] _poll error:', err.message);
        }
    }

    /**
     * Check if application looks like a UWP/Store app host or is empty.
     * @param {string} application - Lowercase application name
     * @returns {boolean}
     * @private
     */
    _isUWPHost(application) {
        if (!application) return true;
        return application === 'applicationframehost' ||
               application === 'applicationframehost.exe' ||
               application === '';
    }

    /**
     * Evaluate the current window against rulesets.
     * @param {string} title - Lowercase window title
     * @param {string} application - Lowercase application name (display name from OS)
     * @param {string} exeFromPath - Lowercase exe filename extracted from path (e.g. "code.exe")
     * @returns {{ score: number, category: string, label: string, source: string } | null}
     * @private
     */
    _evaluate(title, application, exeFromPath) {
        try {
            // 1. Check if it's a browser (by display name OR exe name)
            if (rulesets.isBrowser(application) || rulesets.isBrowser(exeFromPath)) {
                // Match the browser tab title against BROWSER_TITLE_RULES
                const titleMatch = rulesets.matchBrowserTitle(title);
                if (titleMatch) {
                    console.log(`[WindowWatcher] Browser title match: "${title.substring(0, 60)}" → ${titleMatch.label} (score: ${titleMatch.score})`);
                    return { ...titleMatch, source: 'browser_title' };
                }
                // No title match → unknown browser content → needs Gemini
                console.log(`[WindowWatcher] Browser detected but no title rule match for: "${title.substring(0, 60)}"`);
                return { score: -1, category: 'BROWSE_UNKNOWN', label: 'Unknown browser tab', source: 'browser_unknown' };
            }

            // 2. Try matching by exe name from path (most reliable on Windows)
            if (exeFromPath) {
                const exeMatch = rulesets.matchProcess(exeFromPath);
                if (exeMatch) {
                    console.log(`[WindowWatcher] Process rule match (exe from path): "${exeFromPath}" → ${exeMatch.displayName} (score: ${exeMatch.score})`);
                    return {
                        score: exeMatch.score,
                        category: exeMatch.category,
                        label: exeMatch.displayName,
                        source: 'process_rule',
                    };
                }
            }

            // 3. Try matching by application display name
            const processMatch = rulesets.matchProcess(application);
            if (processMatch) {
                console.log(`[WindowWatcher] Process rule match (display name): "${application}" → ${processMatch.displayName} (score: ${processMatch.score})`);
                return {
                    score: processMatch.score,
                    category: processMatch.category,
                    label: processMatch.displayName,
                    source: 'process_rule',
                };
            }

            // 4. Try with .exe suffix on display name
            const withExe = application.endsWith('.exe') ? application : application + '.exe';
            const exeMatch2 = rulesets.matchProcess(withExe);
            if (exeMatch2) {
                console.log(`[WindowWatcher] Process rule match (display name + .exe): "${withExe}" → ${exeMatch2.displayName} (score: ${exeMatch2.score})`);
                return {
                    score: exeMatch2.score,
                    category: exeMatch2.category,
                    label: exeMatch2.displayName,
                    source: 'process_rule',
                };
            }

            // 5. UWP / Store app fallback — if application is empty or ApplicationFrameHost,
            //    match against window TITLE using TITLE_FALLBACK_RULES
            if (this._isUWPHost(application) || this._isUWPHost(exeFromPath)) {
                const titleFallback = rulesets.matchTitleFallback(title);
                if (titleFallback) {
                    console.log(`[WindowWatcher] UWP title fallback match: "${title.substring(0, 60)}" → ${titleFallback.displayName} (score: ${titleFallback.score})`);
                    return {
                        score: titleFallback.score,
                        category: titleFallback.category,
                        label: titleFallback.displayName,
                        source: 'title_fallback_uwp',
                    };
                }
                console.log(`[WindowWatcher] UWP app with no title fallback: app="${application}", exe="${exeFromPath}", title="${title.substring(0, 60)}"`);
            }

            // 6. Last resort: even for non-UWP, try title fallback
            //    (some apps report odd application names)
            const titleFallback = rulesets.matchTitleFallback(title);
            if (titleFallback) {
                console.log(`[WindowWatcher] Title fallback match (non-UWP): "${title.substring(0, 60)}" → ${titleFallback.displayName} (score: ${titleFallback.score})`);
                return {
                    score: titleFallback.score,
                    category: titleFallback.category,
                    label: titleFallback.displayName,
                    source: 'title_fallback',
                };
            }

            // 7. Unknown app → needs Gemini
            console.log(`[WindowWatcher] No match found: app="${application}", exe="${exeFromPath}", title="${title.substring(0, 60)}" → needs Gemini`);
            return null;
        } catch (err) {
            console.warn('[WindowWatcher] _evaluate error:', err.message);
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
                console.log(`[WindowWatcher] >>> Emitting window:ambiguous — ${evaluation.label} — "${windowInfo.title.substring(0, 60)}"`);
                this.emit('window:ambiguous', data);
            } else if (evaluation.score === 0) {
                // Instant distraction
                console.log(`[WindowWatcher] >>> Emitting window:distraction:instant — ${evaluation.label}`);
                this.emit('window:distraction:instant', data);
            } else if (evaluation.score > 0 && evaluation.score <= 40) {
                // Soft distraction
                console.log(`[WindowWatcher] >>> Emitting window:distraction:soft — ${evaluation.label} (score: ${evaluation.score})`);
                this.emit('window:distraction:soft', data);
            } else if (evaluation.score >= 70) {
                // Focus app/site
                console.log(`[WindowWatcher] >>> Emitting window:focus — ${evaluation.label} (score: ${evaluation.score})`);
                this.emit('window:focus', data);
            } else {
                // Middle range (41-69) → ambiguous
                console.log(`[WindowWatcher] >>> Emitting window:ambiguous (mid-range) — ${evaluation.label} (score: ${evaluation.score})`);
                this.emit('window:ambiguous', data);
            }
        } catch (err) {
            console.warn('[WindowWatcher] _emitDetection error:', err.message);
        }
    }
}

module.exports = { WindowWatcher };
