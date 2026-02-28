import React, { useState, useEffect, useRef } from 'react';
import useSessionStore from './store/sessionStore';

/**
 * Active Session view — live focus monitoring display.
 * @param {{ task: string, onStop: () => void }} props
 */
export default function ActiveSession({ task, onStop }) {
    const [score, setScore] = useState(null);
    const [activityType, setActivityType] = useState('');
    const [appName, setAppName] = useState('');
    const [credits, setCredits] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [interventionLevel, setInterventionLevel] = useState(0);
    const [state, setState] = useState('MONITORING');
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState('');
    const [confirmStop, setConfirmStop] = useState(false);
    const [streakSecs, setStreakSecs] = useState(0);
    const [distractionCount, setDistractionCount] = useState(0);
    const startTime = useRef(Date.now());
    const timerRef = useRef(null);

    const { showIntervention } = useSessionStore();

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Listen for session updates
    useEffect(() => {
        const cleanupUpdate = window.electron?.on('sessionUpdate', (data) => {
            if (data.score != null) setScore(data.score);
            if (data.activityType) setActivityType(data.activityType);
            if (data.appName) setAppName(data.appName);
            if (data.credits != null) setCredits(data.credits);
            if (data.interventionLevel != null) setInterventionLevel(data.interventionLevel);
            if (data.state) setState(data.state);
            if (data.streakSecs != null) setStreakSecs(data.streakSecs);
            if (data.distractionCount != null) setDistractionCount(data.distractionCount);
        });

        const cleanupOverlay = window.electron?.on('showOverlay', (data) => {
            setOverlayMessage(data.message || 'Time to refocus!');
            setShowOverlay(true);
        });

        const cleanupCredit = window.electron?.on('creditUpdate', (data) => {
            setCredits(data.balance);
        });

        // Listen for the new mode-aware intervention events
        const cleanupIntervention = window.electron?.on('intervention:show', (data) => {
            showIntervention(data);
        });

        // Get initial credits
        window.electron?.ipc?.getCredits().then(setCredits);

        return () => {
            if (cleanupUpdate) cleanupUpdate();
            if (cleanupOverlay) cleanupOverlay();
            if (cleanupCredit) cleanupCredit();
            if (cleanupIntervention) cleanupIntervention();
        };
    }, []);

    const handleDismissOverlay = async () => {
        setShowOverlay(false);
        setInterventionLevel(0);
        const result = await window.electron?.ipc?.acknowledgeIntervention();
        if (result?.credits != null) setCredits(result.credits);
    };

    const handleStop = () => {
        if (!confirmStop) {
            setConfirmStop(true);
            setTimeout(() => setConfirmStop(false), 3000);
            return;
        }
        onStop();
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const scoreColor = score === null ? 'var(--cx-text-muted)'
        : score >= 70 ? 'var(--cx-success)'
            : score >= 50 ? 'var(--cx-warning)'
                : 'var(--cx-danger)';

    const stateLabel = {
        IDLE: 'Initializing...',
        MONITORING: '✅ Focused',
        DRIFTING: '⚠️ Drifting...',
        INTERVENING: '🚨 Off-task',
        RETURNING: '↩️ Returning...',
    };

    return (
        <div className="p-5 flex flex-col h-full gap-4 relative">
            {/* Intervention Overlay */}
            {showOverlay && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 p-6 animate-fade-in"
                    style={{
                        background: 'rgba(15, 15, 35, 0.95)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <span className="text-5xl">🎯</span>
                    <h2 className="text-xl font-bold text-center" style={{ color: 'var(--cx-text-primary)' }}>
                        Time to Refocus!
                    </h2>
                    <p className="text-sm text-center leading-relaxed max-w-xs" style={{ color: 'var(--cx-text-secondary)' }}>
                        {overlayMessage}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cx-text-muted)' }}>
                        📋 Your task: {task}
                    </p>
                    <button
                        onClick={handleDismissOverlay}
                        className="px-8 py-3 rounded-xl font-semibold text-sm text-white transition-colors cursor-pointer"
                        style={{ background: 'var(--cx-accent)' }}
                        onMouseOver={(e) => e.target.style.background = 'var(--cx-accent-hover)'}
                        onMouseOut={(e) => e.target.style.background = 'var(--cx-accent)'}
                    >
                        ✅ I'm back — let me focus
                    </button>
                </div>
            )}

            {/* Focus Score Ring */}
            <div className="flex flex-col items-center mt-2 mb-2 animate-fade-in">
                <div
                    className="w-28 h-28 rounded-full flex items-center justify-center mb-3"
                    style={{
                        background: `conic-gradient(${scoreColor} ${(score || 0) * 3.6}deg, var(--cx-bg-card) 0deg)`,
                        padding: '4px',
                    }}
                >
                    <div
                        className="w-full h-full rounded-full flex flex-col items-center justify-center"
                        style={{ background: 'var(--cx-bg-primary)' }}
                    >
                        <span className="text-3xl font-extrabold" style={{ color: scoreColor }}>
                            {score !== null ? score : '—'}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cx-text-muted)' }}>Focus</span>
                    </div>
                </div>

                <span className="text-sm font-medium" style={{ color: scoreColor }}>
                    {stateLabel[state] || state}
                </span>
            </div>

            {/* Task */}
            <div
                className="rounded-lg px-4 py-3"
                style={{ background: 'var(--cx-bg-secondary)', border: '1px solid var(--cx-border)' }}
            >
                <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>CURRENT TASK</p>
                <p className="text-sm font-medium" style={{ color: 'var(--cx-text-primary)' }}>
                    📋 {task}
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--cx-bg-card)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Time</p>
                    <p className="text-lg font-bold font-mono" style={{ color: 'var(--cx-text-primary)' }}>
                        {formatTime(elapsed)}
                    </p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--cx-bg-card)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Credits</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--cx-accent-light)' }}>
                        💰 {credits}
                    </p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--cx-bg-card)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Activity</p>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--cx-text-secondary)' }}>
                        {appName || '—'}
                    </p>
                </div>
            </div>

            {/* Activity Type Badge */}
            {activityType && (
                <div className="flex items-center gap-2 px-1">
                    <span className="text-xs" style={{ color: 'var(--cx-text-muted)' }}>Detected:</span>
                    <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                            background: interventionLevel > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: interventionLevel > 0 ? 'var(--cx-danger)' : 'var(--cx-success)',
                        }}
                    >
                        {activityType.replace(/_/g, ' ')}
                    </span>
                </div>
            )}

            {/* Streak & Distraction Row */}
            <div className="flex items-center gap-3 px-1">
                {Math.floor(streakSecs / 60) >= 1 && (
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                            background: Math.floor(streakSecs / 60) >= 30
                                ? 'rgba(239, 68, 68, 0.15)'
                                : Math.floor(streakSecs / 60) >= 15
                                    ? 'rgba(249, 115, 22, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                            color: Math.floor(streakSecs / 60) >= 30
                                ? '#EF4444'
                                : Math.floor(streakSecs / 60) >= 15
                                    ? '#F97316'
                                    : '#F59E0B',
                        }}
                    >
                        🔥 {Math.floor(streakSecs / 60)}m streak
                    </span>
                )}
                {distractionCount > 0 && (
                    <span className="text-[10px]" style={{ color: distractionCount > 3 ? '#EF4444' : 'rgba(255,255,255,0.4)' }}>
                        {distractionCount} distraction{distractionCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Stop Button */}
            <div className="mt-auto pb-2">
                <button
                    onClick={handleStop}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                    style={{
                        background: confirmStop ? 'var(--cx-danger)' : 'var(--cx-bg-card)',
                        color: confirmStop ? 'white' : 'var(--cx-text-secondary)',
                        border: `1px solid ${confirmStop ? 'var(--cx-danger)' : 'var(--cx-border)'}`,
                    }}
                >
                    {confirmStop ? '⚠️ Tap again to confirm end' : '⏹ End Session'}
                </button>
            </div>
        </div>
    );
}
