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
 * On Windows, runs BOTH tasklist and Get-Process to catch Store/UWP apps
 * that tasklist /FO CSV sometimes misses.
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
        this._scanCount = 0;
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
            this._scanCount = 0;

            console.log('[ProcessScanner] ✓ start() called — beginning process polling every 2s');

            // Fire first scan immediately
            this._scan();
            this._interval = setInterval(() => this._scan(), 2000);
            console.log('[ProcessScanner] Started');
        } catch (err) {
            console.error('[ProcessScanner] start failed:', err.message);
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
            console.log('[ProcessScanner] Stopped');
        } catch (err) {
            console.error('[ProcessScanner] stop failed:', err.message);
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
     * On Windows: runs tasklist AND Get-Process, merges results.
     * @private
     */
    _scan() {
        try {
            this._scanCount++;
            const isWindows = process.platform === 'win32';

            if (isWindows) {
                this._scanWindows();
            } else {
                const command = 'ps -axco command';
                exec(command, { timeout: 3000, maxBuffer: 1024 * 512 }, (err, stdout) => {
                    if (err) {
                        console.warn('[ProcessScanner] exec error:', err.message);
                        return;
                    }
                    try {
                        const runningProcesses = this._parseProcessList(stdout, false);
                        console.log(`[ProcessScanner] Scan #${this._scanCount}: found ${runningProcesses.size} processes`);
                        this._evaluate(runningProcesses);
                    } catch (parseErr) {
                        console.warn('[ProcessScanner] parse error:', parseErr.message);
                    }
                });
            }
        } catch (err) {
            console.error('[ProcessScanner] _scan failed:', err.message);
        }
    }

    /**
     * Windows-specific scan: runs tasklist AND Get-Process in parallel,
     * merges results to catch Store/UWP apps.
     * @private
     */
    _scanWindows() {
        const tasklistCmd = 'tasklist /FO CSV /NH';
        const psCmd = 'powershell -NoProfile -Command "Get-Process | Select-Object -ExpandProperty Name"';

        let tasklistDone = false;
        let psDone = false;
        const tasklistProcesses = new Set();
        const psProcesses = new Set();

        const tryMerge = () => {
            if (!tasklistDone || !psDone) return;

            // Merge both sets
            const merged = new Set([...tasklistProcesses, ...psProcesses]);

            // Log diagnostics every 5th scan (not every 2s to reduce noise)
            if (this._scanCount % 5 === 1) {
                const psOnly = [...psProcesses].filter(p => !tasklistProcesses.has(p));
                if (psOnly.length > 0) {
                    console.log(`[ProcessScanner] Get-Process found ${psOnly.length} extra processes not in tasklist: ${psOnly.slice(0, 10).join(', ')}`);
                }
                console.log(`[ProcessScanner] Scan #${this._scanCount}: tasklist=${tasklistProcesses.size}, Get-Process=${psProcesses.size}, merged=${merged.size}`);
            }

            this._evaluate(merged);
        };

        // Run tasklist
        exec(tasklistCmd, { timeout: 3000, maxBuffer: 1024 * 512 }, (err, stdout) => {
            if (err) {
                console.warn('[ProcessScanner] tasklist error:', err.message);
            } else {
                try {
                    const parsed = this._parseProcessList(stdout, true);
                    for (const p of parsed) tasklistProcesses.add(p);
                } catch (e) {
                    console.warn('[ProcessScanner] tasklist parse error:', e.message);
                }
            }
            tasklistDone = true;
            tryMerge();
        });

        // Run Get-Process (catches Store/UWP apps)
        exec(psCmd, { timeout: 4000, maxBuffer: 1024 * 512 }, (err, stdout) => {
            if (err) {
                console.warn('[ProcessScanner] Get-Process error:', err.message);
            } else {
                try {
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim().toLowerCase();
                        if (!trimmed) continue;
                        // Get-Process returns names without .exe — add both forms
                        psProcesses.add(trimmed);
                        if (!trimmed.endsWith('.exe')) {
                            psProcesses.add(trimmed + '.exe');
                        }
                    }
                } catch (e) {
                    console.warn('[ProcessScanner] Get-Process parse error:', e.message);
                }
            }
            psDone = true;
            tryMerge();
        });
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

                // Log every match on first scan, then every 15th scan
                if (this._scanCount === 1 || this._scanCount % 15 === 0) {
                    console.log(`[ProcessScanner] Checking: ${procName} → match: ${rule.displayName} (score: ${rule.score}, cat: ${rule.category})`);
                }

                if (rule.score >= 0 && rule.score <= 30) {
                    distractions.push({ processName: procName, ...rule });
                    worstScore = Math.min(worstScore, rule.score);
                }
                if (rule.score >= 70) {
                    focusApps.push({ processName: procName, ...rule });
                    bestScore = Math.max(bestScore, rule.score);
                }
            }

            this._lastResult = { distractions, focusApps, worstScore, bestScore };

            // Summary log on first scan
            if (this._scanCount === 1) {
                console.log(`[ProcessScanner] First scan summary: ${distractions.length} distractions, ${focusApps.length} focus apps`);
                if (distractions.length > 0) {
                    console.log(`[ProcessScanner]   Distractions: ${distractions.map(d => d.displayName).join(', ')}`);
                }
                if (focusApps.length > 0) {
                    console.log(`[ProcessScanner]   Focus apps: ${focusApps.map(f => f.displayName).join(', ')}`);
                }
            }

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

                // Skip ambiguous UWP marker — it's handled by WindowWatcher title fallback
                if (rule.score === -1) continue;

                if (rule.score === 0) {
                    console.log(`[ProcessScanner] >>> Emitting instant:distraction for ${rule.displayName} (${procName})`);
                    this.emit('instant:distraction', {
                        processName: procName,
                        displayName: rule.displayName,
                        score: 0,
                        category: rule.category,
                    });
                } else if (rule.score > 0 && rule.score <= 30) {
                    // NEW: also emit soft:newprocess for soft distractions on first appearance
                    console.log(`[ProcessScanner] >>> Emitting soft:flag (new) for ${rule.displayName} (${procName}, score: ${rule.score})`);
                    this.emit('soft:flag', {
                        processName: procName,
                        displayName: rule.displayName,
                        score: rule.score,
                        category: rule.category,
                    });
                } else if (rule.score >= 70) {
                    console.log(`[ProcessScanner] >>> Emitting instant:focus for ${rule.displayName} (${procName})`);
                    this.emit('instant:focus', {
                        processName: procName,
                        displayName: rule.displayName,
                        score: rule.score,
                    });
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
            console.error('[ProcessScanner] _evaluate failed:', err.message);
        }
    }
}

module.exports = { ProcessScanner };
