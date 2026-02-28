'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

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
        width: 420,
        height: 640,
        minWidth: 380,
        minHeight: 500,
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
        intervention.acknowledge();
        wsServer.sendCommand({ type: 'CLEAR' });
        const newBalance = db.mutateCredits(5, 'self_correction');
        return { credits: newBalance };
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
}

/**
 * Forward session events from core modules to the renderer process.
 */
function registerSessionEvents() {
    session.on('sessionUpdate', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionUpdate', data);
        }
    });

    session.on('sessionStarted', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionStarted', data);
        }
    });

    session.on('sessionEnded', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('sessionEnded', data);
        }
    });

    session.on('showOverlay', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('showOverlay', data);
        }
    });

    session.on('creditUpdate', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('creditUpdate', data);
        }
    });

    session.on('intervention', (data) => {
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('intervention', data);
        }
    });

    session.on('minimiseApp', () => {
        console.log('[main] Minimise request received');
    });
}

// --- App Lifecycle ---
app.whenReady().then(() => {
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

    // Wire IPC and events
    registerIpcHandlers();
    registerSessionEvents();

    console.log('[main] CognitionX started');
});

app.on('window-all-closed', () => {
    // Don't quit on window close — we run in the tray
});

app.on('before-quit', () => {
    if (wsServer) wsServer.stopServer();
    if (db) db.closeDatabase();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
