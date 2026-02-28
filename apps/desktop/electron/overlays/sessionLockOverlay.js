'use strict';

const { BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * Session lock warning overlay — fullscreen overlay shown when user
 * tries to override a strict mode session.
 */
class SessionLockOverlay {
    constructor() {
        this._window = null;
    }

    create(isDev) {
        try {
            const display = screen.getPrimaryDisplay();
            const { width, height } = display.bounds;

            this._window = new BrowserWindow({
                width,
                height,
                x: 0,
                y: 0,
                transparent: true,
                frame: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: false,
                movable: false,
                focusable: true,
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
                this._window.loadURL('http://localhost:5173/src/ui/overlays/sessionlock.html');
            } else {
                this._window.loadFile(path.join(__dirname, '..', '..', 'dist', 'src', 'ui', 'overlays', 'sessionlock.html'));
            }

            this._window.setIgnoreMouseEvents(true, { forward: true });

            this._window.on('close', (e) => {
                e.preventDefault();
                this.hide();
            });

            console.log('[sessionLockOverlay] Window created');
        } catch (err) {
            console.error('[sessionLockOverlay] Failed to create:', err.message);
        }
    }

    /**
     * Show the session lock warning.
     * @param {{ reason: string, endsAt: string }} data
     */
    show(data) {
        try {
            if (!this._window) return;
            const display = screen.getPrimaryDisplay();
            this._window.setBounds(display.bounds);
            this._window.webContents.send('sessionlock:show', data);
            this._window.showInactive();
            this._window.setAlwaysOnTop(true, 'screen-saver');
            this._window.setIgnoreMouseEvents(true, { forward: true });
        } catch (err) {
            console.error('[sessionLockOverlay] show failed:', err.message);
        }
    }

    hide() {
        try {
            if (this._window) {
                this._window.webContents.send('sessionlock:hide');
                this._window.hide();
                this._window.setIgnoreMouseEvents(true, { forward: true });
            }
        } catch (err) {
            console.error('[sessionLockOverlay] hide failed:', err.message);
        }
    }

    captureMouse() {
        try {
            if (this._window) this._window.setIgnoreMouseEvents(false);
        } catch (err) { /* ignore */ }
    }

    releaseMouse() {
        try {
            if (this._window) this._window.setIgnoreMouseEvents(true, { forward: true });
        } catch (err) { /* ignore */ }
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
            console.error('[sessionLockOverlay] destroy failed:', err.message);
        }
    }
}

module.exports = new SessionLockOverlay();
