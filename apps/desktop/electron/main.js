'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const overlayManager = require('./overlays/overlayManager');

// Load .env from the desktop app directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let mainWindow = null;
let tray = null;

// Lazy-loaded core modules (loaded after app is ready)
let session = null;
let intervention = null;
let db = null;
let wsServer = null;

/**
 * Create the main application window.
 */
function createWindow() {
    const isDev = !app.isPackaged;

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        transparent: false,
        backgroundColor: '#0f0f23',
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
        show: false,
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

/**
 * Create the system tray icon and menu.
 */
function createTray() {
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC41ZYUyZQAAAEhJREFUOE9jYBgFgx4wMjL+h2IGTE5MTEwMhp2cnBiB4v+BmAFZDFkNsiYQH6cBMJdgMwCbOFYD8IURZAAsMEcBagAAJjcgERz2gLAAAAAASUVORK5CYII='
    );
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show CognitionX',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                if (mainWindow) mainWindow.destroy();
                app.quit();
            },
        },
    ]);

    tray.setToolTip('CognitionX — Focus Mode');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

/**
 * Register all IPC handlers for main ↔ renderer communication.
 */
function registerIpcHandlers() {
    ipcMain.handle('startSession', async (event, { task, duration }) => {
        if (typeof task !== 'string' || task.trim().length === 0) {
            throw new Error('Invalid task');
        }
        if (task.length > 200) {
            throw new Error('Task too long');
        }
        return await session.startSession(task.trim(), duration);
    });

    ipcMain.handle('stopSession', async () => {
        return await session.stopSession();
    });

    ipcMain.handle('getSessionStatus', () => {
        return session.getStatus();
    });

    ipcMain.handle('acknowledgeIntervention', async () => {
        const result = session.handleSelfCorrection();
        return { credits: result ? result.balance : 0, bonus: result ? result.bonus : 0 };
    });

    ipcMain.handle('intervention:dismiss', (event, level) => {
        try {
            if (typeof level !== 'number') return;
            intervention.acknowledge();
            session.emit('intervention:hide', {});
        } catch (err) {
            console.error('[ipc] intervention:dismiss failed:', err.message);
        }
    });

    ipcMain.handle('intervention:selfCorrected', () => {
        try {
            return session.handleSelfCorrection();
        } catch (err) {
            console.error('[ipc] intervention:selfCorrected failed:', err.message);
            return null;
        }
    });

    ipcMain.handle('settings:getMode', () => {
        try {
            return intervention.getMode();
        } catch (err) {
            console.error('[ipc] settings:getMode failed:', err.message);
            return 'balanced';
        }
    });

    ipcMain.handle('settings:getAll', () => {
        try {
            return db.getAllSettings();
        } catch (err) {
            console.error('[ipc] settings:getAll failed:', err.message);
            return {};
        }
    });

    ipcMain.handle('settings:save', (event, data) => {
        try {
            if (!data || typeof data !== 'object') return;
            for (const [key, value] of Object.entries(data)) {
                if (typeof key !== 'string' || key.length > 100) continue;
                db.setSetting(key, value);
            }
            // If mode changed, update the intervention engine
            if (data.intervention_mode) {
                intervention.setMode(data.intervention_mode);
            }
            return { success: true };
        } catch (err) {
            console.error('[ipc] settings:save failed:', err.message);
            return { success: false };
        }
    });

    ipcMain.handle('getCredits', () => {
        return db.getCreditsBalance();
    });

    ipcMain.handle('spendCredits', (event, { amount, minutes }) => {
        const balance = db.getCreditsBalance();
        if (balance < amount) {
            return { success: false, balance };
        }
        const newBalance = db.mutateCredits(-amount, `delay_${minutes}min`);
        return { success: true, balance: newBalance };
    });

    ipcMain.handle('getSessions', () => {
        return db.getRecentSessions(10);
    });

    ipcMain.handle('getSessionActivities', (event, sessionId) => {
        return db.getSessionActivities(sessionId);
    });

    ipcMain.handle('minimizeWindow', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.handle('closeWindow', () => {
        if (mainWindow) mainWindow.hide();
    });

    ipcMain.handle('isExtensionConnected', () => {
        return wsServer.isExtensionConnected();
    });

    // --- Overlay IPC Handlers ---
    ipcMain.on('overlay:dismissed', (event, { level, action }) => {
        try {
            overlayManager.hideIntervention();
            intervention.acknowledge();
        } catch (err) {
            console.error('[ipc] overlay:dismissed failed:', err.message);
        }
    });

    ipcMain.on('overlay:selfCorrected', () => {
        try {
            overlayManager.hideIntervention();
            const result = session.handleSelfCorrection();
            if (result && result.bonus > 0) {
                overlayManager.showCreditEarned({ amount: result.bonus, reason: 'self_correction' });
            }
        } catch (err) {
            console.error('[ipc] overlay:selfCorrected failed:', err.message);
        }
    });

    ipcMain.on('overlay:spendCredits', (event, { amount }) => {
        try {
            const balance = db.getCreditsBalance();
            if (balance >= amount) {
                db.mutateCredits(-amount, 'delay_intervention');
            }
            overlayManager.hideIntervention();
        } catch (err) {
            console.error('[ipc] overlay:spendCredits failed:', err.message);
        }
    });

    ipcMain.on('overlay:captureMouseEvents', () => {
        overlayManager.captureInterventionMouse();
    });

    ipcMain.on('overlay:releaseMouseEvents', () => {
        overlayManager.releaseInterventionMouse();
    });

    ipcMain.on('sessionlock:captureMouseEvents', () => {
        overlayManager.captureSessionLockMouse();
    });

    ipcMain.on('sessionlock:releaseMouseEvents', () => {
        overlayManager.releaseSessionLockMouse();
    });

    ipcMain.on('sessionlock:stayFocused', () => {
        overlayManager.hideSessionLock();
    });

    ipcMain.on('sessionlock:override', () => {
        overlayManager.hideSessionLock();
        session.stopSession().catch((err) => {
            console.error('[ipc] sessionlock:override failed:', err.message);
        });
    });
}

/**
 * Forward session events from core modules to the renderer process.
 */
function registerSessionEvents() {
    session.on('sessionUpdate', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionUpdate', data);
        }
        // Update the focus bar overlay with latest data
        overlayManager.updateFocusBar({
            score: data.score || 0,
            streak: data.streakSecs || 0,
            task: data.appName || '',
            credits: data.credits || 0,
        });
    });

    session.on('sessionStarted', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionStarted', data);
        }
        // Show the focus bar when a session starts
        overlayManager.showFocusBar();
        overlayManager.updateFocusBar({
            score: 100, streak: 0, task: data.task || '', credits: 0,
        });
    });

    session.on('sessionEnded', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionEnded', data);
        }
        // Hide the focus bar when session ends
        overlayManager.hideFocusBar();
    });

    session.on('showOverlay', (data) => {
        // Redirected to overlay windows
        overlayManager.showIntervention(data);
    });

    session.on('creditUpdate', (data) => {
        // Show credit notification on overlay + forward to main renderer
        if (data.earned && data.earned > 0) {
            overlayManager.showCreditEarned({ amount: data.earned, reason: data.reason || 'focus_block' });
        }
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('creditUpdate', data);
        }
    });

    session.on('intervention', (data) => {
        // Informational — still goes to main renderer for ActiveSession display
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('intervention', data);
        }
    });

    // --- New intervention events ---
    // --- Intervention events now go to overlay windows ---
    session.on('intervention:show', (data) => {
        overlayManager.showIntervention(data);
    });

    session.on('intervention:hide', () => {
        overlayManager.hideIntervention();
    });

    session.on('intervention:countdown', (data) => {
        overlayManager.tickIntervention(data.remaining);
    });

    session.on('intervention:forceClosed', (data) => {
        overlayManager.hideIntervention();
        // Still inform the main renderer for logging/display
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('intervention:forceClosed', data);
        }
    });

    session.on('minimiseApp', () => {
        console.log('[main] Minimise request received');
    });
}

// --- App Lifecycle ---
app.whenReady().then(() => {
    const isDev = !app.isPackaged;

    // Load core modules AFTER app is ready (they may import Electron APIs)
    session = require('../src/core/session');
    intervention = require('../src/core/intervention');
    db = require('../src/db/database');
    wsServer = require('../src/core/wsServer');

    // Initialize database
    db.initDatabase(app.getPath('userData'));

    // Start WebSocket server for Chrome Extension
    wsServer.startServer();

    // Create UI
    createWindow();
    createTray();

    // Create all overlay windows
    overlayManager.initAll(isDev);

    // Wire IPC and events
    registerIpcHandlers();
    registerSessionEvents();

    console.log('[main] CognitionX started (with overlay system)');
});

app.on('window-all-closed', () => {
    // Don't quit on window close — we run in the tray
});

app.on('before-quit', () => {
    overlayManager.destroyAll();
    if (wsServer) wsServer.stopServer();
    if (db) db.closeDatabase();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
