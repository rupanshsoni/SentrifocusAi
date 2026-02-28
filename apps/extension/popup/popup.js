/**
 * CognitionX Chrome Extension — Popup Script
 * Reads connection status and focus data from chrome.storage.local.
 */

async function updatePopup() {
    try {
        const data = await chrome.storage.local.get([
            'connected',
            'focusScore',
            'task',
        ]);

        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        const sessionInfo = document.getElementById('session-info');
        const noSession = document.getElementById('no-session');
        const scoreValue = document.getElementById('score-value');
        const taskDisplay = document.getElementById('task-display');

        // Connection status
        if (data.connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected to desktop app';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected — start the desktop app';
        }

        // Session info
        if (data.task && data.task.length > 0) {
            sessionInfo.style.display = 'block';
            noSession.style.display = 'none';

            // Focus score with color coding
            const score = data.focusScore || 0;
            scoreValue.textContent = `${score}/100`;

            scoreValue.classList.remove('score-good', 'score-warn', 'score-bad');
            if (score >= 70) {
                scoreValue.classList.add('score-good');
            } else if (score >= 50) {
                scoreValue.classList.add('score-warn');
            } else {
                scoreValue.classList.add('score-bad');
            }

            // Task text
            taskDisplay.textContent = `📋 ${data.task}`;
        } else {
            sessionInfo.style.display = 'none';
            noSession.style.display = 'block';
        }
    } catch (err) {
        console.error('[CognitionX Popup] Error:', err.message);
    }
}

// Update on open
updatePopup();

// Listen for storage changes while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        updatePopup();
    }
});
