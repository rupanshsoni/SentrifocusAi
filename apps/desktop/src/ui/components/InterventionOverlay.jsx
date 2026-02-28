import React, { useState, useEffect, useRef } from 'react';
import useSessionStore from '../store/sessionStore';

/**
 * InterventionOverlay — the primary intervention component.
 * Renders a full-screen overlay with mode-appropriate blur, messaging,
 * countdown timers, and action buttons.
 */
export default function InterventionOverlay() {
    const {
        interventionVisible,
        interventionData,
        countdownRemaining,
        hideIntervention,
        tickCountdown,
        setCountdown,
        incrementDistraction,
    } = useSessionStore();

    const [buttonsEnabled, setButtonsEnabled] = useState(false);
    const [selfCorrectionBonus, setSelfCorrectionBonus] = useState(null);
    const [showBonusAnim, setShowBonusAnim] = useState(false);
    const buttonTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const shownAtRef = useRef(null);

    // On show: start button delay timer and countdown listener
    useEffect(() => {
        if (!interventionVisible || !interventionData) {
            setButtonsEnabled(false);
            setSelfCorrectionBonus(null);
            return;
        }

        shownAtRef.current = Date.now();

        // Button delay (disabled for N seconds)
        const delay = interventionData.buttonDelay || 0;
        if (delay > 0 && interventionData.mode !== 'gentle') {
            setButtonsEnabled(false);
            buttonTimerRef.current = setTimeout(() => {
                setButtonsEnabled(true);
            }, delay * 1000);
        } else {
            setButtonsEnabled(true);
        }

        return () => {
            if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
        };
    }, [interventionVisible, interventionData]);

    // Listen for countdown ticks and force-close from main process
    useEffect(() => {
        const cleanupCountdown = window.electron?.on('intervention:countdown', (data) => {
            setCountdown(data.remaining);
        });

        const cleanupHide = window.electron?.on('intervention:hide', () => {
            hideIntervention();
        });

        const cleanupForceClosed = window.electron?.on('intervention:forceClosed', (data) => {
            hideIntervention();
        });

        return () => {
            if (cleanupCountdown) cleanupCountdown();
            if (cleanupHide) cleanupHide();
            if (cleanupForceClosed) cleanupForceClosed();
        };
    }, []);

    if (!interventionVisible || !interventionData) return null;

    const {
        level,
        mode,
        appName,
        message,
        streakSecs,
        distractionCount,
        countdownSecs,
        blurPx,
        bgOpacity,
        position,
        creditsEnabled,
        task,
    } = interventionData;

    // --- Handlers ---
    const handleImBack = async () => {
        try {
            const result = await window.electron?.ipc?.selfCorrected();
            if (result && result.bonus > 0) {
                setSelfCorrectionBonus(result.bonus);
                setShowBonusAnim(true);
                setTimeout(() => {
                    setShowBonusAnim(false);
                    hideIntervention();
                }, 1500);
            } else {
                hideIntervention();
            }
        } catch (err) {
            hideIntervention();
        }
    };

    const handleDelay = async (minutes, creditCost) => {
        try {
            const result = await window.electron?.ipc?.spendCredits(creditCost, minutes);
            if (result?.success) {
                hideIntervention();
            }
        } catch (err) {
            console.error('Delay failed:', err);
        }
    };

    const handleCloseApp = async () => {
        try {
            await window.electron?.ipc?.dismissIntervention(level);
        } catch (err) {
            console.error('Close app failed:', err);
        }
    };

    // --- Streak display ---
    const streakMins = Math.floor((streakSecs || 0) / 60);
    const streakColor = streakMins >= 30
        ? '#EF4444'
        : streakMins >= 15
            ? '#F97316'
            : '#F59E0B';

    // --- Blur and background ---
    const backdropStyle = {
        backdropFilter: `blur(${blurPx || 8}px)`,
        WebkitBackdropFilter: `blur(${blurPx || 8}px)`,
        background: `rgba(0, 0, 0, ${bgOpacity || 0.5})`,
    };

    // --- Card positioning ---
    const isCenter = position === 'center' || mode === 'strict';
    const cardPositionClass = isCenter
        ? 'items-center justify-center'
        : 'items-end justify-end pb-8 pr-8';

    // --- Strict mode pulsing border ---
    const strictBorderClass = mode === 'strict'
        ? 'border-red-500/60 animate-pulse'
        : 'border-white/10';

    // --- Determine buttons ---
    const renderButtons = () => {
        // L3 strict: NO BUTTONS, countdown only
        if (level >= 3 && mode === 'strict') {
            return null;
        }

        // L3 balanced: only "Close App Now"
        if (level >= 3 && mode === 'balanced') {
            return (
                <div className="flex gap-3 w-full">
                    <button
                        onClick={handleCloseApp}
                        disabled={!buttonsEnabled}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: '#EF4444', color: 'white' }}
                    >
                        Close {appName} Now
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-3">
                    {/* I'm Back button */}
                    <button
                        onClick={handleImBack}
                        disabled={!buttonsEnabled}
                        className="relative flex-1 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
                        style={{
                            background: buttonsEnabled ? '#22C55E' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                        }}
                    >
                        {!buttonsEnabled && interventionData.buttonDelay > 0 && (
                            <span className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </span>
                        )}
                        <span className={!buttonsEnabled && interventionData.buttonDelay > 0 ? 'opacity-0' : ''}>
                            ✅ I'm Back
                        </span>

                        {/* Self-correction bonus animation */}
                        {showBonusAnim && (
                            <span
                                className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-bold pointer-events-none"
                                style={{
                                    color: '#22C55E',
                                    animation: 'floatUp 1.5s ease-out forwards',
                                }}
                            >
                                +{selfCorrectionBonus} credits
                            </span>
                        )}
                    </button>

                    {/* Delay button (if credits enabled and not strict or L3) */}
                    {creditsEnabled && level < 3 && (
                        <button
                            onClick={() => {
                                if (mode === 'gentle' && level === 1) {
                                    handleDelay(5, 0); // free 5 min in gentle L1
                                } else if (mode === 'gentle') {
                                    handleDelay(15, 30);
                                } else if (mode === 'balanced' && level === 1) {
                                    handleDelay(5, 20);
                                } else {
                                    handleDelay(15, 60);
                                }
                            }}
                            disabled={!buttonsEnabled}
                            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                        >
                            {mode === 'gentle' && level === 1
                                ? 'Give me 5 mins (free)'
                                : mode === 'gentle'
                                    ? 'Delay 15 mins (30 💰)'
                                    : level === 1
                                        ? 'Delay 5 mins (20 💰)'
                                        : 'Delay 15 mins (60 💰)'}
                        </button>
                    )}
                </div>

                {/* Close App button for balanced L2 */}
                {mode === 'balanced' && level >= 2 && (
                    <button
                        onClick={handleCloseApp}
                        disabled={!buttonsEnabled}
                        className="w-full py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        Close {appName}
                    </button>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Float-up animation keyframes */}
            <style>{`
                @keyframes floatUp {
                    0% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -40px); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInCenter {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div
                className={`fixed inset-0 z-[9999] flex ${cardPositionClass}`}
                style={backdropStyle}
            >
                {/* Intervention Card */}
                <div
                    className={`max-w-sm w-full rounded-2xl p-6 flex flex-col gap-4 border ${strictBorderClass}`}
                    style={{
                        background: mode === 'strict'
                            ? 'rgba(10, 10, 10, 0.95)'
                            : 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        animation: isCenter
                            ? 'fadeInCenter 0.3s ease-out'
                            : 'slideUp 0.3s ease-out',
                        boxShadow: mode === 'strict'
                            ? '0 0 40px rgba(239, 68, 68, 0.15)'
                            : '0 8px 32px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    {/* App header */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔴</span>
                        <span
                            className="text-sm font-bold tracking-wide"
                            style={{ color: mode === 'strict' ? '#FF4444' : '#F59E0B' }}
                        >
                            {appName || 'Unknown App'}
                        </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        "{message}"
                    </p>

                    {/* Task reminder */}
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        📋 Your task: "{task}"
                    </p>

                    {/* Countdown timer */}
                    {(countdownSecs > 0 || countdownRemaining !== null) && (
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⏱</span>
                            <span
                                className="text-xl font-bold font-mono tabular-nums"
                                style={{
                                    color: (countdownRemaining || 0) <= 5 ? '#EF4444' : '#F59E0B',
                                }}
                            >
                                {countdownRemaining !== null ? countdownRemaining : countdownSecs}s
                            </span>
                        </div>
                    )}

                    {/* Streak at risk */}
                    {streakMins >= 5 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm">🔥</span>
                            <span
                                className="text-sm font-semibold"
                                style={{ color: streakColor }}
                            >
                                Streak at risk: {streakMins} mins
                            </span>
                        </div>
                    )}

                    {/* Distraction mirror */}
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        You've been distracted{' '}
                        <span
                            className="font-bold"
                            style={{ color: (distractionCount || 0) > 3 ? '#EF4444' : 'rgba(255,255,255,0.6)' }}
                        >
                            {distractionCount || 0}
                        </span>{' '}
                        times this session.
                    </p>

                    {/* Buttons */}
                    {renderButtons()}
                </div>
            </div>
        </>
    );
}
