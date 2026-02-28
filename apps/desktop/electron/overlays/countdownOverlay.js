'use strict';

const { BrowserWindow, screen } = require('electron');
const path = require('path');

const SIZE = 180;
const MARGIN = 20;

/**
 * Countdown timer overlay — 180×180 circle in bottom-right corner.
 * Appears during L3 interventions alongside the main overlay.
 */
class CountdownOverlay {
    constructor() {
        this._window = null;
    }

    create(isDev) {
        try {
            const display = screen.getPrimaryDisplay();
            const { width, height } = display.workAreaSize;

            this._window = new BrowserWindow({
                width: SIZE,
                height: SIZE,
                x: display.bounds.x + width - SIZE - MARGIN,
                y: display.bounds.y + height - SIZE - MARGIN,
                transparent: true,
                frame: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: false,
                movable: false,
                focusable: false,
                hasShadow: false,
                show: false,
                backgroundColor: '#00000000',
                webPreferences: {
                    preload: path.join(__dirname, '..', 'overlayPreload.js'),
                    contextIsolation: true,
                    nodeIntegration: false,
                    sandbox: false,
                },
            });

            if (isDev) {
                this._window.loadURL('http://localhost:5173/src/ui/overlays/countdown.html');
            } else {
                this._window.loadFile(path.join(__dirname, '..', '..', 'dist', 'src', 'ui', 'overlays', 'countdown.html'));
            }

            this._window.setAlwaysOnTop(true, 'screen-saver');
            this._window.setIgnoreMouseEvents(true);

            this._window.on('close', (e) => {
                e.preventDefault();
                this._window.hide();
            });

            console.log('[countdownOverlay] Window created');
        } catch (err) {
            console.error('[countdownOverlay] Failed to create:', err.message);
        }
    }

    /**
     * Show the countdown timer.
     * @param {{ seconds: number, appName: string }} data
     */
    show(data) {
        try {
            if (!this._window) return;
            this._window.webContents.send('countdown:show', data);
            this._window.showInactive();
            this._window.setAlwaysOnTop(true, 'screen-saver');
        } catch (err) {
            console.error('[countdownOverlay] show failed:', err.message);
        }
    }

    /**
     * Update remaining seconds.
     * @param {number} remaining
     */
    tick(remaining) {
        try {
            if (this._window && this._window.isVisible()) {
                this._window.webContents.send('countdown:tick', { remaining });
            }
        } catch (err) {
            console.error('[countdownOverlay] tick failed:', err.message);
        }
    }

    hide() {
        try {
            if (this._window) {
                this._window.webContents.send('countdown:hide');
                this._window.hide();
            }
        } catch (err) {
            console.error('[countdownOverlay] hide failed:', err.message);
        }
    }

    getWindow() { return this._window; }

    destroy() {
        try {
            if (this._window) {
                this._window.removeAllListeners('close');
                this._window.destroy();
                this._window = null;
            }
        } catch (err) {
            console.error('[countdownOverlay] destroy failed:', err.message);
        }
    }
}

module.exports = new CountdownOverlay();
