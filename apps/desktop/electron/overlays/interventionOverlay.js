'use strict';

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

/**
 * Manages the fullscreen transparent intervention overlay BrowserWindow.
 * Appears ON TOP of all other windows (including fullscreen games).
 */
class InterventionOverlay {
    constructor() {
        this._window = null;
        this._isDev = false;
    }

    /**
     * Create the overlay window (hidden by default).
     * @param {boolean} isDev
     */
    create(isDev) {
        try {
            this._isDev = isDev;
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

            // Load the overlay HTML
            if (isDev) {
                this._window.loadURL('http://localhost:5173/src/ui/overlays/intervention.html');
            } else {
                this._window.loadFile(path.join(__dirname, '..', '..', 'dist', 'src', 'ui', 'overlays', 'intervention.html'));
            }

            // Start with mouse passthrough enabled
            this._window.setIgnoreMouseEvents(true, { forward: true });

            // Prevent the window from being closed — just hide it
            this._window.on('close', (e) => {
                e.preventDefault();
                this.hide();
            });

            console.log('[interventionOverlay] Window created');
        } catch (err) {
            console.error('[interventionOverlay] Failed to create window:', err.message);
        }
    }

    /**
     * Show the overlay with intervention data.
     * @param {object} data - Intervention payload
     */
    show(data) {
        try {
            if (!this._window) return;

            // Position on the display nearest the cursor
            const cursor = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(cursor);
            this._window.setBounds(display.bounds);

            // Send data to the overlay renderer
            this._window.webContents.send('overlay:show', data);

            // Show without stealing focus, then set always-on-top level
            this._window.showInactive();
            this._window.setAlwaysOnTop(true, 'screen-saver');
            this._window.setIgnoreMouseEvents(true, { forward: true });

            console.log(`[interventionOverlay] Shown — L${data.level} (${data.mode})`);
        } catch (err) {
            console.error('[interventionOverlay] show failed:', err.message);
        }
    }

    /**
     * Hide the overlay.
     */
    hide() {
        try {
            if (!this._window) return;
            this._window.webContents.send('overlay:hide');
            this._window.hide();
            this._window.setIgnoreMouseEvents(true, { forward: true });
            console.log('[interventionOverlay] Hidden');
        } catch (err) {
            console.error('[interventionOverlay] hide failed:', err.message);
        }
    }

    /**
     * Send a countdown tick to the overlay.
     * @param {number} remaining
     */
    tick(remaining) {
        try {
            if (this._window && this._window.isVisible()) {
                this._window.webContents.send('overlay:countdown:tick', { remaining });
            }
        } catch (err) {
            console.error('[interventionOverlay] tick failed:', err.message);
        }
    }

    /**
     * Enable mouse capture (card hovered).
     */
    captureMouse() {
        try {
            if (this._window) {
                this._window.setIgnoreMouseEvents(false);
            }
        } catch (err) {
            console.error('[interventionOverlay] captureMouse failed:', err.message);
        }
    }

    /**
     * Release mouse capture (card unhovered — clicks pass through).
     */
    releaseMouse() {
        try {
            if (this._window) {
                this._window.setIgnoreMouseEvents(true, { forward: true });
            }
        } catch (err) {
            console.error('[interventionOverlay] releaseMouse failed:', err.message);
        }
    }

    /** @returns {BrowserWindow|null} */
    getWindow() { return this._window; }

    /** @returns {boolean} */
    isVisible() { return this._window ? this._window.isVisible() : false; }

    destroy() {
        try {
            if (this._window) {
                this._window.removeAllListeners('close');
                this._window.destroy();
                this._window = null;
            }
        } catch (err) {
            console.error('[interventionOverlay] destroy failed:', err.message);
        }
    }
}

module.exports = new InterventionOverlay();
