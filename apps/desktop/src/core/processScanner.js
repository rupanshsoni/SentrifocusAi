'use strict';

const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { PROCESS_RULES } = require('./rulesets');

/**
 * CognitionX — Layer 1: Process Scanner
 *
 * Polls the OS process list every 2 seconds and compares against
 * known distraction/focus process names. Emits events for instant
 * detection without needing screenshots or AI.
 *
 * Latency: ~500ms from process launch to detection.
 */
class ProcessScanner extends EventEmitter {
    constructor() {
        super();
        this._interval = null;
        this._previousProcesses = new Set();
        this._lastResult = null;
        this._sessionTask = '';
    }

    /**
     * Start polling the process list.
     * @param {string} sessionTask - The user's declared focus task
     */
    start(sessionTask) {
        try {
            if (this._interval) return;
            this._sessionTask = sessionTask || '';
            this._previousProcesses = new Set();
            this._lastResult = null;

            // Fire first scan immediately
            this._scan();
            this._interval = setInterval(() => this._scan(), 2000);
            console.log('[processScanner] Started');
        } catch (err) {
            console.error('[processScanner] start failed:', err.message);
        }
    }

    /**
     * Stop polling.
     */
    stop() {
        try {
            if (this._interval) {
                clearInterval(this._interval);
                this._interval = null;
            }
            this._previousProcesses = new Set();
            this._lastResult = null;
            console.log('[processScanner] Stopped');
        } catch (err) {
            console.error('[processScanner] stop failed:', err.message);
        }
    }

    /**
     * Get the result of the last scan.
     * @returns {{ distractions: Array, focusApps: Array, worstScore: number, bestScore: number } | null}
     */
    getLastResult() {
        return this._lastResult;
    }

    /**
     * Perform a single process scan.
     * @private
     */
    _scan() {
        try {
            const isWindows = process.platform === 'win32';
            const command = isWindows
                ? 'tasklist /FO CSV /NH'
                : 'ps -axco command';

            exec(command, { timeout: 3000, maxBuffer: 1024 * 512 }, (err, stdout) => {
                if (err) {
                    // Silent fail — don't crash the app
                    console.warn('[processScanner] exec error:', err.message);
                    return;
                }

                try {
                    const runningProcesses = this._parseProcessList(stdout, isWindows);
                    this._evaluate(runningProcesses);
                } catch (parseErr) {
                    console.warn('[processScanner] parse error:', parseErr.message);
                }
            });
        } catch (err) {
            console.error('[processScanner] _scan failed:', err.message);
        }
    }

    /**
     * Parse raw process list output into a Set of lowercase process names.
     * @param {string} stdout - Raw output from tasklist/ps
     * @param {boolean} isWindows
     * @returns {Set<string>}
     * @private
     */
    _parseProcessList(stdout, isWindows) {
        const processes = new Set();

        if (isWindows) {
            // tasklist /FO CSV /NH format: "process.exe","PID","Session","SessionNum","Mem"
            const lines = stdout.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                // Extract first quoted field
                const match = trimmed.match(/^"([^"]+)"/);
                if (match) {
                    processes.add(match[1].toLowerCase());
                }
            }
        } else {
            // ps -axco command: one process name per line
            const lines = stdout.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed !== 'COMMAND') {
                    processes.add(trimmed.toLowerCase());
                }
            }
        }

        return processes;
    }

    /**
     * Evaluate running processes against PROCESS_RULES and emit events.
     * @param {Set<string>} currentProcesses
     * @private
     */
    _evaluate(currentProcesses) {
        try {
            const distractions = [];
            const focusApps = [];
            let worstScore = 100;
            let bestScore = 0;

            for (const procName of currentProcesses) {
                const rule = PROCESS_RULES[procName];
                if (!rule) continue;

                if (rule.score <= 30) {
                    distractions.push({ processName: procName, ...rule });
                    worstScore = Math.min(worstScore, rule.score);
                }
                if (rule.score >= 70) {
                    focusApps.push({ processName: procName, ...rule });
                    bestScore = Math.max(bestScore, rule.score);
                }
            }

            this._lastResult = { distractions, focusApps, worstScore, bestScore };

            // Detect NEW processes that weren't in the previous scan
            const newProcesses = new Set();
            for (const proc of currentProcesses) {
                if (!this._previousProcesses.has(proc)) {
                    newProcesses.add(proc);
                }
            }

            // Emit events for newly appeared processes
            for (const procName of newProcesses) {
                const rule = PROCESS_RULES[procName];
                if (!rule) continue;

                if (rule.score === 0) {
                    this.emit('instant:distraction', {
                        processName: procName,
                        displayName: rule.displayName,
                        score: 0,
                        category: rule.category,
                    });
                    console.log(`[processScanner] INSTANT distraction: ${rule.displayName} (${procName})`);
                } else if (rule.score >= 80) {
                    this.emit('instant:focus', {
                        processName: procName,
                        displayName: rule.displayName,
                        score: rule.score,
                    });
                    console.log(`[processScanner] INSTANT focus: ${rule.displayName} (${procName})`);
                }
            }

            // Emit soft flags for ALL currently running soft distractions (every scan)
            for (const d of distractions) {
                if (d.score > 0 && d.score <= 30) {
                    this.emit('soft:flag', {
                        processName: d.processName,
                        displayName: d.displayName,
                        score: d.score,
                        category: d.category,
                    });
                }
            }

            // Update previous set for next diff
            this._previousProcesses = currentProcesses;
        } catch (err) {
            console.error('[processScanner] _evaluate failed:', err.message);
        }
    }
}

module.exports = { ProcessScanner };
