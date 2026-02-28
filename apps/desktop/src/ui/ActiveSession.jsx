import React, { useState, useEffect, useRef } from 'react';

/**
 * Active Session view — live focus monitoring display.
 * Landscape layout: score ring + stats left, details right.
 * Interventions are handled by overlay windows (not rendered here).
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
    const [confirmStop, setConfirmStop] = useState(false);
    const [streakSecs, setStreakSecs] = useState(0);
    const [distractionCount, setDistractionCount] = useState(0);
    const startTime = useRef(Date.now());
    const timerRef = useRef(null);

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // Listen for session updates from main process
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

        const cleanupCredit = window.electron?.on('creditUpdate', (data) => {
            setCredits(data.balance);
        });

        // Get initial credits
        window.electron?.ipc?.getCredits().then(setCredits);

        return () => {
            if (cleanupUpdate) cleanupUpdate();
            if (cleanupCredit) cleanupCredit();
        };
    }, []);

    const handleStop = () => {
        if (!confirmStop) {
            setConfirmStop(true);
            setTimeout(() => setConfirmStop(false), 3000);
            return;
        }
        onStop();
    };

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const scoreColor = score === null ? 'text-gray-400'
        : score >= 70 ? 'text-emerald-500'
            : score >= 50 ? 'text-amber-500'
                : 'text-red-500';

    const scoreColorHex = score === null ? '#9CA3AF'
        : score >= 70 ? '#22C55E'
            : score >= 50 ? '#F59E0B'
                : '#EF4444';

    const stateLabel = {
        IDLE: 'Initializing...',
        MONITORING: '✅ Focused',
        DRIFTING: '⚠️ Drifting...',
        INTERVENING: '🚨 Off-task',
        RETURNING: '↩️ Returning...',
    };

    const streakMins = Math.floor(streakSecs / 60);

    return (
        <div className="flex items-center justify-center h-full p-6 animate-fade-in">
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-stretch">

                {/* Left Column: Score Ring + State */}
                <div className="flex flex-col items-center justify-center gap-4 md:w-64 shrink-0">
                    {/* Focus Score Ring — large circular gauge */}
                    <div
                        className="w-40 h-40 rounded-full flex items-center justify-center"
                        style={{
                            background: `conic-gradient(${scoreColorHex} ${(score || 0) * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
                            padding: '5px',
                        }}
                    >
                        <div className="w-full h-full rounded-full flex flex-col items-center justify-center
                                        bg-white dark:bg-[#0b0b0d]">
                            <span className={`text-5xl font-extrabold ${scoreColor}`}>
                                {score !== null ? score : '—'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Focus Score</span>
                        </div>
                    </div>

                    {/* State */}
                    <span className={`text-sm font-semibold ${scoreColor}`}>
                        {stateLabel[state] || state}
                    </span>

                    {/* Timer */}
                    <span className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                        {formatTime(elapsed)}
                    </span>
                </div>

                {/* Right Column: Task, Stats, Activity, Stop */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Task */}
                    <div className="rounded-xl p-4 bg-gray-50 dark:bg-white/[0.03]
                                    border border-gray-200 dark:border-white/[0.06]">
                        <p className="text-xs mb-1 text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
                            Current Task
                        </p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            📋 {task}
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl p-4 text-center bg-gray-50 dark:bg-white/[0.03]
                                        border border-gray-200 dark:border-white/[0.06]">
                            <p className="text-xs mb-1 text-gray-400 dark:text-gray-500">Credits</p>
                            <p className="text-xl font-bold text-violet-500">💰 {credits}</p>
                        </div>
                        <div className="rounded-xl p-4 text-center bg-gray-50 dark:bg-white/[0.03]
                                        border border-gray-200 dark:border-white/[0.06]">
                            <p className="text-xs mb-1 text-gray-400 dark:text-gray-500">Current App</p>
                            <p className="text-xs font-medium truncate text-gray-700 dark:text-gray-300">
                                {appName || '—'}
                            </p>
                        </div>
                        <div className="rounded-xl p-4 text-center bg-gray-50 dark:bg-white/[0.03]
                                        border border-gray-200 dark:border-white/[0.06]">
                            <p className="text-xs mb-1 text-gray-400 dark:text-gray-500">Distractions</p>
                            <p className={`text-xl font-bold ${distractionCount > 3 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                {distractionCount}
                            </p>
                        </div>
                    </div>

                    {/* Activity + Streak badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {activityType && (
                            <span
                                className={`text-xs font-medium px-3 py-1 rounded-full
                                    ${interventionLevel > 0
                                        ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                                    }`}
                            >
                                {activityType.replace(/_/g, ' ')}
                            </span>
                        )}

                        {streakMins >= 1 && (
                            <span
                                className={`text-xs font-semibold px-3 py-1 rounded-full
                                    ${streakMins >= 30 ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                                        : streakMins >= 15 ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500'
                                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'}`}
                            >
                                🔥 {streakMins}m streak
                            </span>
                        )}
                    </div>

                    {/* Stop Button — pushed to bottom */}
                    <div className="mt-auto pt-4">
                        <button
                            onClick={handleStop}
                            className={`w-full py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all
                                ${confirmStop
                                    ? 'bg-red-500 text-white border border-red-500'
                                    : 'bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08] hover:border-red-300 dark:hover:border-red-500/40'
                                }`}
                        >
                            {confirmStop ? '⚠️ Tap again to confirm end' : '⏹ End Session'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
