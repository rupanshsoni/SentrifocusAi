'use strict';

const { BrowserWindow, screen } = require('electron');
const path = require('path');

const BAR_HEIGHT = 32;

/**
 * Persistent focus bar — thin strip at top of primary display.
 * Shows focus score, streak, current task, and credit balance.
 */
class FocusBarOverlay {
    constructor() {
        this._window = null;
    }

    create(isDev) {
        try {
            const display = screen.getPrimaryDisplay();
            const { width } = display.bounds;

            this._window = new BrowserWindow({
                width,
                height: BAR_HEIGHT,
                x: display.bounds.x,
                y: display.bounds.y,
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
                this._window.loadURL('http://localhost:5173/src/ui/overlays/focusbar.html');
            } else {
                this._window.loadFile(path.join(__dirname, '..', '..', 'dist', 'src', 'ui', 'overlays', 'focusbar.html'));
            }

            this._window.setAlwaysOnTop(true, 'screen-saver');
            this._window.setIgnoreMouseEvents(true);

            this._window.on('close', (e) => {
                e.preventDefault();
                this._window.hide();
            });

            // Reposition on display change
            screen.on('display-metrics-changed', () => this._reposition());
            screen.on('display-added', () => this._reposition());
            screen.on('display-removed', () => this._reposition());

            console.log('[focusBarOverlay] Window created');
        } catch (err) {
            console.error('[focusBarOverlay] Failed to create:', err.message);
        }
    }

    show() {
        try {
            if (!this._window) return;
            this._window.showInactive();
            this._window.setAlwaysOnTop(true, 'screen-saver');
        } catch (err) {
            console.error('[focusBarOverlay] show failed:', err.message);
        }
    }

    hide() {
        try {
            if (this._window) this._window.hide();
        } catch (err) {
            console.error('[focusBarOverlay] hide failed:', err.message);
        }
    }

    /**
     * Update the focus bar content.
     * @param {{ score: number, streak: number, task: string, credits: number }} data
     */
    update(data) {
        try {
            if (this._window) {
                this._window.webContents.send('focusbar:update', data);
            }
        } catch (err) {
            console.error('[focusBarOverlay] update failed:', err.message);
        }
    }

    _reposition() {
        try {
            if (!this._window) return;
            const display = screen.getPrimaryDisplay();
            this._window.setBounds({
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: BAR_HEIGHT,
            });
        } catch (err) {
            console.error('[focusBarOverlay] reposition failed:', err.message);
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
            console.error('[focusBarOverlay] destroy failed:', err.message);
        }
    }
}

module.exports = new FocusBarOverlay();
