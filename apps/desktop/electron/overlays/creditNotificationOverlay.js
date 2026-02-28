'use strict';

const { BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * Credit earned notification — small floating toast that
 * slides in from right and auto-dismisses after 2.5s.
 * Queues multiple notifications sequentially.
 */
class CreditNotificationOverlay {
    constructor() {
        this._window = null;
        this._queue = [];
        this._showing = false;
        this._hideTimer = null;
    }

    create(isDev) {
        try {
            const display = screen.getPrimaryDisplay();
            const { width } = display.workAreaSize;

            this._window = new BrowserWindow({
                width: 260,
                height: 72,
                x: display.bounds.x + width - 280,
                y: display.bounds.y + 50,
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
                this._window.loadURL('http://localhost:5173/src/ui/overlays/credit.html');
            } else {
                this._window.loadFile(path.join(__dirname, '..', '..', 'dist', 'src', 'ui', 'overlays', 'credit.html'));
            }

            this._window.setAlwaysOnTop(true, 'floating');
            this._window.setIgnoreMouseEvents(true);

            this._window.on('close', (e) => {
                e.preventDefault();
                this._window.hide();
            });

            console.log('[creditNotificationOverlay] Window created');
        } catch (err) {
            console.error('[creditNotificationOverlay] Failed to create:', err.message);
        }
    }

    /**
     * Show a credit notification. Queues if another is showing.
     * @param {{ amount: number, reason: string }} data
     */
    show(data) {
        this._queue.push(data);
        if (!this._showing) {
            this._showNext();
        }
    }

    _showNext() {
        if (this._queue.length === 0) {
            this._showing = false;
            return;
        }

        try {
            this._showing = true;
            const data = this._queue.shift();

            if (!this._window) return;

            this._window.webContents.send('credit:show', data);
            this._window.showInactive();
            this._window.setAlwaysOnTop(true, 'floating');

            this._hideTimer = setTimeout(() => {
                this._window.webContents.send('credit:hide');
                setTimeout(() => {
                    if (this._window) this._window.hide();
                    this._showNext();
                }, 400); // wait for exit animation
            }, 2500);
        } catch (err) {
            console.error('[creditNotificationOverlay] _showNext failed:', err.message);
            this._showing = false;
        }
    }

    hide() {
        try {
            if (this._hideTimer) clearTimeout(this._hideTimer);
            if (this._window) this._window.hide();
            this._showing = false;
            this._queue = [];
        } catch (err) {
            console.error('[creditNotificationOverlay] hide failed:', err.message);
        }
    }

    getWindow() { return this._window; }

    destroy() {
        try {
            if (this._hideTimer) clearTimeout(this._hideTimer);
            if (this._window) {
                this._window.removeAllListeners('close');
                this._window.destroy();
                this._window = null;
            }
        } catch (err) {
            console.error('[creditNotificationOverlay] destroy failed:', err.message);
        }
    }
}

module.exports = new CreditNotificationOverlay();
