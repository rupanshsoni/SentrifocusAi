'use strict';

const WebSocket = require('ws');

const PORT = 7823;

let wss = null;
let extensionClient = null;
let tabChangedCallbacks = [];

/**
 * Start the WebSocket server on port 7823.
 */
function startServer() {
    try {
        wss = new WebSocket.Server({ port: PORT });

        wss.on('listening', () => {
            console.log(`[wsServer] WebSocket server listening on port ${PORT}`);
        });

        wss.on('connection', (ws) => {
            console.log('[wsServer] Extension connected');
            extensionClient = ws;

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (!msg.type || typeof msg.type !== 'string') return;

                    console.log('[wsServer] Received:', msg.type);

                    switch (msg.type) {
                        case 'CONNECTED':
                            console.log('[wsServer] Extension confirmed connection');
                            break;

                        case 'TAB_CHANGED':
                            if (msg.url && msg.title) {
                                tabChangedCallbacks.forEach((cb) => {
                                    try {
                                        cb({ url: msg.url, title: msg.title });
                                    } catch (err) {
                                        console.error('[wsServer] tabChanged callback error:', err.message);
                                    }
                                });
                            }
                            break;

                        default:
                            console.log('[wsServer] Unknown message type:', msg.type);
                    }
                } catch (err) {
                    console.warn('[wsServer] Invalid message received:', err.message);
                }
            });

            ws.on('close', () => {
                console.log('[wsServer] Extension disconnected');
                if (extensionClient === ws) {
                    extensionClient = null;
                }
            });

            ws.on('error', (err) => {
                console.error('[wsServer] Client error:', err.message);
            });
        });

        wss.on('error', (err) => {
            console.error('[wsServer] Server error:', err.message);
        });
    } catch (err) {
        console.error('[wsServer] startServer failed:', err.message);
    }
}

/**
 * Send a command to the connected Chrome extension.
 * @param {object} commandObject - Command to send (e.g., { type: 'BLUR_TAB' })
 * @returns {boolean} true if sent successfully
 */
function sendCommand(commandObject) {
    try {
        if (!extensionClient || extensionClient.readyState !== WebSocket.OPEN) {
            console.warn('[wsServer] Extension not connected, cannot send command');
            return false;
        }

        const message = JSON.stringify(commandObject);
        extensionClient.send(message);
        console.log('[wsServer] Sent command:', commandObject.type);
        return true;
    } catch (err) {
        console.error('[wsServer] sendCommand failed:', err.message);
        return false;
    }
}

/**
 * Check if the Chrome extension is currently connected.
 * @returns {boolean}
 */
function isExtensionConnected() {
    return extensionClient !== null && extensionClient.readyState === WebSocket.OPEN;
}

/**
 * Register a callback for TAB_CHANGED events.
 * @param {function} callback - Called with { url: string, title: string }
 */
function onTabChanged(callback) {
    if (typeof callback === 'function') {
        tabChangedCallbacks.push(callback);
    }
}

/**
 * Stop the WebSocket server and clean up.
 */
function stopServer() {
    try {
        tabChangedCallbacks = [];
        if (extensionClient) {
            extensionClient.close();
            extensionClient = null;
        }
        if (wss) {
            wss.close();
            wss = null;
            console.log('[wsServer] Server stopped');
        }
    } catch (err) {
        console.error('[wsServer] stopServer failed:', err.message);
    }
}

module.exports = { startServer, sendCommand, isExtensionConnected, onTabChanged, stopServer };
