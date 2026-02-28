'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipc: {
        // Session
        startSession: (task, duration) =>
            ipcRenderer.invoke('startSession', { task, duration }),
        stopSession: () =>
            ipcRenderer.invoke('stopSession'),
        getSessionStatus: () =>
            ipcRenderer.invoke('getSessionStatus'),

        // Intervention
        acknowledgeIntervention: () =>
            ipcRenderer.invoke('acknowledgeIntervention'),

        // Credits
        getCredits: () =>
            ipcRenderer.invoke('getCredits'),
        spendCredits: (amount, minutes) =>
            ipcRenderer.invoke('spendCredits', { amount, minutes }),

        // Sessions History
        getSessions: () =>
            ipcRenderer.invoke('getSessions'),
        getSessionActivities: (sessionId) =>
            ipcRenderer.invoke('getSessionActivities', sessionId),

        // Window Controls
        minimizeWindow: () =>
            ipcRenderer.invoke('minimizeWindow'),
        closeWindow: () =>
            ipcRenderer.invoke('closeWindow'),

        // Extension Status
        isExtensionConnected: () =>
            ipcRenderer.invoke('isExtensionConnected'),
    },

    // Event listeners from main process
    on: (channel, callback) => {
        const validChannels = [
            'sessionUpdate',
            'sessionStarted',
            'sessionEnded',
            'showOverlay',
            'creditUpdate',
            'intervention',
        ];
        if (validChannels.includes(channel)) {
            const subscription = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, subscription);
            // Return cleanup function
            return () => ipcRenderer.removeListener(channel, subscription);
        }
    },

    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
