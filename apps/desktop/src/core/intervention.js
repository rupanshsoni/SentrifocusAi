'use strict';

// --- FSM States ---
const STATES = {
    IDLE: 'IDLE',
    MONITORING: 'MONITORING',
    DRIFTING: 'DRIFTING',
    INTERVENING: 'INTERVENING',
    RETURNING: 'RETURNING',
};

// --- Intervention Levels ---
const LEVELS = {
    TOAST: { level: 1, type: 'TOAST' },
    OVERLAY: { level: 2, type: 'OVERLAY' },
    MEDIA_PAUSE: { level: 3, type: 'MEDIA_PAUSE' },
    EXTENSION_COMMAND: { level: 4, type: 'EXTENSION_COMMAND' },
    MINIMISE: { level: 5, type: 'MINIMISE' },
};

// --- Internal State ---
let state = STATES.IDLE;
let driftCounter = 0;
let focusCounter = 0;
let settings = {
    forceCloseEnabled: false,
};

/**
 * Process a new relevance score and determine the appropriate action.
 *
 * State transition rules:
 * - MONITORING: relevance >= 80 for 2+ consecutive checks
 * - DRIFTING: relevance < 70 (start counting)
 * - INTERVENING: driftCounter >= 2 AND confidence > 60
 * - RETURNING: user calls acknowledge()
 *
 * @param {number} score - Relevance score 0-100
 * @param {string} activityType - One of the activity_type enum values
 * @param {number} confidence - Confidence score 0-100
 * @returns {{level: number, type: string, message: string}|null} Action object or null (on-task)
 */
function processScore(score, activityType, confidence) {
    try {
        // If idle, begin monitoring on first call
        if (state === STATES.IDLE) {
            state = STATES.MONITORING;
        }

        // On-task: relevance >= 70
        if (score >= 70) {
            // Reset drift counter, track focus streaks
            driftCounter = 0;
            focusCounter++;

            if (focusCounter >= 2) {
                state = STATES.MONITORING;
            }

            // No action needed — user is focused
            return null;
        }

        // Off-task: relevance < 70
        focusCounter = 0;
        driftCounter++;

        // Only intervene if confidence is sufficient
        if (confidence <= 60 && driftCounter < 3) {
            // Low confidence — log silently, don't intervene yet
            state = STATES.DRIFTING;
            return null;
        }

        state = STATES.INTERVENING;

        // Determine intervention level
        const isVideo = activityType && (
            activityType.includes('VIDEO') ||
            activityType === 'GAMING'
        );
        const isBrowseDistraction = activityType === 'BROWSE_DISTRACTION' ||
            activityType === 'SOCIAL_MEDIA';

        // Level 5: Force minimize after 4+ drifts (if enabled)
        if (driftCounter >= 4 && settings.forceCloseEnabled) {
            return {
                ...LEVELS.MINIMISE,
                message: 'You\'ve been off-task for a while. Minimizing the distraction to help you refocus.',
            };
        }

        // Level 4: Browser distraction → send blur command to extension
        if (isBrowseDistraction && driftCounter >= 2) {
            return {
                ...LEVELS.EXTENSION_COMMAND,
                message: 'Looks like you\'ve drifted to browsing. Let\'s get back on track!',
            };
        }

        // Level 3: Video/media detected → pause media
        if (isVideo && driftCounter >= 2) {
            return {
                ...LEVELS.MEDIA_PAUSE,
                message: 'Pausing media so you can refocus on your task.',
            };
        }

        // Level 2: 2+ consecutive drifts → overlay
        if (driftCounter >= 2) {
            return {
                ...LEVELS.OVERLAY,
                message: 'Hey! You\'ve been drifting for a bit. Your task is waiting — you\'ve got this!',
            };
        }

        // Level 1: First drift → gentle toast nudge
        return {
            ...LEVELS.TOAST,
            message: 'Quick nudge — looks like you stepped away from your task. Need to refocus?',
        };
    } catch (err) {
        console.error('[intervention] processScore failed:', err.message);
        return null;
    }
}

/**
 * Get the current FSM state.
 * @returns {string}
 */
function getState() {
    return state;
}

/**
 * User acknowledges the intervention — resets drift counter and
 * transitions back to MONITORING.
 */
function acknowledge() {
    try {
        driftCounter = 0;
        focusCounter = 0;
        state = STATES.RETURNING;
        // Immediately transition to monitoring
        state = STATES.MONITORING;
        console.log('[intervention] User acknowledged — back to MONITORING');
    } catch (err) {
        console.error('[intervention] acknowledge failed:', err.message);
    }
}

/**
 * Full reset to IDLE state. Called when a session ends.
 */
function reset() {
    try {
        state = STATES.IDLE;
        driftCounter = 0;
        focusCounter = 0;
        console.log('[intervention] Reset to IDLE');
    } catch (err) {
        console.error('[intervention] reset failed:', err.message);
    }
}

/**
 * Update intervention settings.
 * @param {object} newSettings
 */
function updateSettings(newSettings) {
    try {
        if (newSettings && typeof newSettings === 'object') {
            settings = { ...settings, ...newSettings };
        }
    } catch (err) {
        console.error('[intervention] updateSettings failed:', err.message);
    }
}

/**
 * Get the current drift counter (useful for UI display).
 * @returns {number}
 */
function getDriftCounter() {
    return driftCounter;
}

module.exports = {
    processScore,
    getState,
    acknowledge,
    reset,
    updateSettings,
    getDriftCounter,
};
