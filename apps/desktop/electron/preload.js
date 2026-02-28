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
        dismissIntervention: (level) =>
            ipcRenderer.invoke('intervention:dismiss', level),
        selfCorrected: () =>
            ipcRenderer.invoke('intervention:selfCorrected'),

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

        // Settings
        getMode: () =>
            ipcRenderer.invoke('settings:getMode'),
        getAllSettings: () =>
            ipcRenderer.invoke('settings:getAll'),
        saveSettings: (data) =>
            ipcRenderer.invoke('settings:save', data),

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
            'creditUpdate',
            'intervention',
            'intervention:forceClosed',
            // intervention:show/hide/countdown now handled by overlay windows
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
