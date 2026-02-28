import { create } from 'zustand';

const useSessionStore = create((set, get) => ({
    // --- Intervention Mode ---
    mode: 'balanced',           // 'gentle' | 'balanced' | 'strict'
    lockedMode: null,           // locked at session start, cannot change until session ends
    isSessionLocked: false,

    // --- Streak & Distraction ---
    currentStreakSecs: 0,       // continuous focus seconds (score >= 70), reset on distraction
    distractionCount: 0,        // total distractions this session
    totalDistractedSecs: 0,     // total time lost to distractions

    // --- Intervention Overlay ---
    interventionVisible: false,
    interventionData: null,     // { level, mode, appName, message, streakSecs, distractionCount, countdownSecs }
    countdownRemaining: null,   // seconds remaining on force-close countdown

    // --- Settings (cached from SQLite) ---
    blurIntensity: 'medium',    // 'light' | 'medium' | 'heavy' | 'blackout'
    toastPosition: 'bottom-right',
    forceCloseDelay: 30,
    soundAlert: false,
    appWhitelist: [],
    appBlacklist: [],

    // --- Actions ---
    setMode: (mode) => set({ mode }),
    lockMode: (mode) => set({ lockedMode: mode, isSessionLocked: true, mode }),
    unlockMode: () => set({ lockedMode: null, isSessionLocked: false }),

    incrementDistraction: () => set((s) => ({
        distractionCount: s.distractionCount + 1,
    })),

    addDistractedTime: (secs) => set((s) => ({
        totalDistractedSecs: s.totalDistractedSecs + secs,
    })),

    setStreakSecs: (secs) => set({ currentStreakSecs: secs }),
    resetStreak: () => set({ currentStreakSecs: 0 }),

    showIntervention: (data) => set({
        interventionVisible: true,
        interventionData: data,
        countdownRemaining: data.countdownSecs || null,
    }),

    hideIntervention: () => set({
        interventionVisible: false,
        interventionData: null,
        countdownRemaining: null,
    }),

    tickCountdown: () => {
        const current = get().countdownRemaining;
        if (current !== null && current > 0) {
            set({ countdownRemaining: current - 1 });
        }
    },

    setCountdown: (secs) => set({ countdownRemaining: secs }),

    // Bulk load settings from SQLite
    loadSettings: (settings) => set({
        mode: settings.intervention_mode || 'balanced',
        blurIntensity: settings.blur_intensity || 'medium',
        toastPosition: settings.toast_position || 'bottom-right',
        forceCloseDelay: parseInt(settings.force_close_delay, 10) || 30,
        soundAlert: settings.sound_alert === 'true',
        appWhitelist: JSON.parse(settings.app_whitelist || '[]'),
        appBlacklist: JSON.parse(settings.app_blacklist || '[]'),
    }),

    // Reset session-specific state
    resetSession: () => set({
        currentStreakSecs: 0,
        distractionCount: 0,
        totalDistractedSecs: 0,
        interventionVisible: false,
        interventionData: null,
        countdownRemaining: null,
    }),
}));

export default useSessionStore;
