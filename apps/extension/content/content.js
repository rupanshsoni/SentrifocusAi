/**
 * CognitionX Chrome Extension — Content Script
 *
 * Handles commands from the background service worker:
 * - BLUR_TAB: Inject full-page blur overlay
 * - MUTE_TAB: Mute all video/audio elements
 * - CLEAR: Remove overlay and unmute media
 * - REDIRECT_TAB: Navigate to a different URL
 *
 * All actions are idempotent (safe to call multiple times).
 */

const OVERLAY_ID = 'cx-focus-overlay';

/**
 * Inject a full-page blur overlay with a focus message.
 */
function blurTab() {
    // Don't duplicate if already exists
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  `;

    const icon = document.createElement('span');
    icon.textContent = '🎯';
    icon.style.cssText = 'font-size: 48px;';

    const message = document.createElement('p');
    message.textContent = 'CognitionX — Time to get back to your task!';
    message.style.cssText = `
    color: white;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    margin: 0;
    padding: 0 24px;
    max-width: 500px;
    line-height: 1.4;
  `;

    const subtext = document.createElement('p');
    subtext.textContent = 'Click below or use the desktop app to dismiss';
    subtext.style.cssText = `
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    margin: 0;
  `;

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = "I'm back — let me through";
    dismissBtn.style.cssText = `
    margin-top: 8px;
    padding: 12px 32px;
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    font-family: inherit;
  `;
    dismissBtn.onmouseover = () => { dismissBtn.style.background = '#4338CA'; };
    dismissBtn.onmouseout = () => { dismissBtn.style.background = '#4F46E5'; };
    dismissBtn.onclick = () => clearOverlay();

    overlay.appendChild(icon);
    overlay.appendChild(message);
    overlay.appendChild(subtext);
    overlay.appendChild(dismissBtn);

    document.body.appendChild(overlay);
}

/**
 * Mute all video and audio elements on the page.
 */
function muteTab() {
    document.querySelectorAll('video, audio').forEach((el) => {
        el.muted = true;
    });
}

/**
 * Remove the blur overlay and unmute all media elements.
 */
function clearOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
    }
    document.querySelectorAll('video, audio').forEach((el) => {
        el.muted = false;
    });
}

/**
 * Redirect the current tab to a specified URL.
 * @param {string} url
 */
function redirectTab(url) {
    if (url && typeof url === 'string') {
        window.location.href = url;
    }
}

// --- Listen for messages from the background service worker ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (!message || !message.type) return;

        switch (message.type) {
            case 'BLUR_TAB':
                blurTab();
                break;

            case 'MUTE_TAB':
                muteTab();
                break;

            case 'CLEAR':
                clearOverlay();
                break;

            case 'REDIRECT_TAB':
                redirectTab(message.url);
                break;

            default:
                console.log('[CognitionX] Unknown content script command:', message.type);
        }
    } catch (err) {
        console.error('[CognitionX] Content script error:', err.message);
    }
});
