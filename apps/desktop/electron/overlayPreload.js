'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Overlay preload — separate from main renderer preload.
 * Exposes only overlay-specific IPC channels via window.overlayBridge.
 */
contextBridge.exposeInMainWorld('overlayBridge', {
    // --- Receive from main ---
    onShow: (cb) => { ipcRenderer.on('overlay:show', (e, data) => cb(data)); },
    onHide: (cb) => { ipcRenderer.on('overlay:hide', () => cb()); },
    onTick: (cb) => { ipcRenderer.on('overlay:countdown:tick', (e, data) => cb(data)); },

    // Focus bar
    onFocusBarUpdate: (cb) => { ipcRenderer.on('focusbar:update', (e, data) => cb(data)); },

    // Countdown
    onCountdownShow: (cb) => { ipcRenderer.on('countdown:show', (e, data) => cb(data)); },
    onCountdownTick: (cb) => { ipcRenderer.on('countdown:tick', (e, data) => cb(data)); },
    onCountdownHide: (cb) => { ipcRenderer.on('countdown:hide', () => cb()); },

    // Credit notification
    onCreditShow: (cb) => { ipcRenderer.on('credit:show', (e, data) => cb(data)); },
    onCreditHide: (cb) => { ipcRenderer.on('credit:hide', () => cb()); },

    // Session lock
    onSessionLockShow: (cb) => { ipcRenderer.on('sessionlock:show', (e, data) => cb(data)); },
    onSessionLockHide: (cb) => { ipcRenderer.on('sessionlock:hide', () => cb()); },

    // --- Send to main ---
    dismiss: (level, action) => ipcRenderer.send('overlay:dismissed', { level, action }),
    selfCorrected: () => ipcRenderer.send('overlay:selfCorrected'),
    spendCredits: (amount) => ipcRenderer.send('overlay:spendCredits', { amount }),
    captureMouse: () => ipcRenderer.send('overlay:captureMouseEvents'),
    releaseMouse: () => ipcRenderer.send('overlay:releaseMouseEvents'),

    // Session lock specific
    sessionLockCaptureMouse: () => ipcRenderer.send('sessionlock:captureMouseEvents'),
    sessionLockReleaseMouse: () => ipcRenderer.send('sessionlock:releaseMouseEvents'),
    sessionLockStayFocused: () => ipcRenderer.send('sessionlock:stayFocused'),
    sessionLockOverride: () => ipcRenderer.send('sessionlock:override'),
});
