/**
 * CognitionX Chrome Extension — Background Service Worker
 *
 * Connects to the desktop app via WebSocket on localhost:7823.
 * Routes commands from desktop app to content scripts.
 * Reports tab changes back to the desktop app.
 */

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL_MS = 2000;
const WS_URL = 'ws://localhost:7823';

/**
 * Connect to the CognitionX desktop app WebSocket server.
 */
function connectWebSocket() {
    try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('[CognitionX] Connected to desktop app');
            reconnectAttempts = 0;
            ws.send(JSON.stringify({ type: 'CONNECTED' }));
            // Store connection status
            chrome.storage.local.set({ connected: true, lastConnected: Date.now() });
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (!msg.type || typeof msg.type !== 'string') return;

                console.log('[CognitionX] Received command:', msg.type);

                // Store latest data for popup
                if (msg.type === 'FOCUS_SCORE') {
                    chrome.storage.local.set({
                        focusScore: msg.score,
                        task: msg.task || '',
                    });
                }

                // Route command to the active tab's content script
                routeToActiveTab(msg);
            } catch (err) {
                console.warn('[CognitionX] Invalid message:', err.message);
            }
        };

        ws.onclose = () => {
            console.log('[CognitionX] Disconnected from desktop app');
            ws = null;
            chrome.storage.local.set({ connected: false });
            attemptReconnect();
        };

        ws.onerror = (err) => {
            console.error('[CognitionX] WebSocket error');
            ws = null;
        };
    } catch (err) {
        console.error('[CognitionX] connectWebSocket failed:', err.message);
        attemptReconnect();
    }
}

/**
 * Attempt to reconnect with exponential backoff.
 */
function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[CognitionX] Max reconnect attempts reached. Stopping.');
        return;
    }

    reconnectAttempts++;
    console.log(`[CognitionX] Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
        connectWebSocket();
    }, RECONNECT_INTERVAL_MS);
}

/**
 * Route a command from the desktop app to the active tab's content script.
 * @param {object} command
 */
async function routeToActiveTab(command) {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
            console.warn('[CognitionX] No active tab found');
            return;
        }

        // Skip chrome:// and extension pages
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
            console.log('[CognitionX] Skipping chrome:// page');
            return;
        }

        chrome.tabs.sendMessage(activeTab.id, command);
    } catch (err) {
        console.error('[CognitionX] routeToActiveTab failed:', err.message);
    }
}

/**
 * Send a message to the desktop app via WebSocket.
 * @param {object} message
 */
function sendToDesktop(message) {
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    } catch (err) {
        console.error('[CognitionX] sendToDesktop failed:', err.message);
    }
}

// --- Listen for tab changes ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.title) {
        // Don't report chrome:// URLs
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

        console.log('[CognitionX] Tab updated:', tab.title);
        sendToDesktop({
            type: 'TAB_CHANGED',
            url: tab.url,
            title: tab.title,
        });
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && tab.title) {
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

            sendToDesktop({
                type: 'TAB_CHANGED',
                url: tab.url,
                title: tab.title,
            });
        }
    } catch (err) {
        console.error('[CognitionX] onActivated failed:', err.message);
    }
});

// --- Initialize connection on startup ---
connectWebSocket();

// --- Periodic reconnect check ---
setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        reconnectAttempts = 0; // Reset attempts for periodic check
        connectWebSocket();
    }
}, 30000); // Every 30 seconds
