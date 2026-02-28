import React, { useState, useEffect, useRef } from 'react';

/**
 * InterventionOverlayApp — runs inside a dedicated transparent BrowserWindow.
 * Renders a translucent backdrop + glassmorphic intervention card.
 * Communicates with main process via window.overlayBridge.
 */
export default function InterventionOverlayApp() {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [buttonsEnabled, setButtonsEnabled] = useState(false);
    const [bonusAnim, setBonusAnim] = useState(null);
    const buttonTimerRef = useRef(null);

    useEffect(() => {
        const bridge = window.overlayBridge;
        if (!bridge) return;

        bridge.onShow((d) => {
            setData(d);
            setCountdown(d.countdownSecs || null);
            setVisible(true);
            setButtonsEnabled(false);
            setBonusAnim(null);

            const delay = d.buttonDelay || 0;
            if (delay > 0 && d.mode !== 'gentle') {
                buttonTimerRef.current = setTimeout(() => setButtonsEnabled(true), delay * 1000);
            } else {
                setButtonsEnabled(true);
            }
        });

        bridge.onHide(() => {
            setVisible(false);
            setData(null);
            setCountdown(null);
            if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
        });

        bridge.onTick(({ remaining }) => {
            setCountdown(remaining);
        });
    }, []);

    if (!visible || !data) return null;

    const { level, mode, appName, message, streakSecs, distractionCount,
        countdownSecs, position, creditsEnabled, task } = data;

    // Backdrop opacity per mode
    const bgOpacity = mode === 'strict' ? 0.75 : mode === 'balanced' ? 0.6 : 0.45;
    const isCenter = position === 'center' || mode === 'strict';
    const streakMins = Math.floor((streakSecs || 0) / 60);

    // Mouse passthrough: card captures, backdrop passes through
    const handleCardEnter = () => window.overlayBridge?.captureMouse();
    const handleCardLeave = () => window.overlayBridge?.releaseMouse();

    const handleImBack = () => {
        window.overlayBridge?.selfCorrected();
        // Bonus animation could be shown, but since main will hide us, just trigger
    };

    const handleDelay = (minutes, creditCost) => {
        window.overlayBridge?.spendCredits(creditCost);
    };

    const handleCloseApp = () => {
        window.overlayBridge?.dismiss(level, 'close');
    };

    // Card animation
    const cardAnim = isCenter
        ? 'animate-scale-in'
        : 'animate-slide-up';

    // Strict pulsing border
    const borderColor = mode === 'strict' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)';

    const renderButtons = () => {
        if (level >= 3 && mode === 'strict') return null;

        if (level >= 3 && mode === 'balanced') {
            return (
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    <button
                        onClick={handleCloseApp}
                        disabled={!buttonsEnabled}
                        style={{
                            ...btnBase,
                            background: '#EF4444',
                            color: 'white',
                            opacity: buttonsEnabled ? 1 : 0.3,
                            flex: 1,
                        }}
                    >
                        Close {appName} Now
                    </button>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={handleImBack}
                        disabled={!buttonsEnabled}
                        style={{
                            ...btnBase,
                            background: buttonsEnabled ? '#22C55E' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            opacity: buttonsEnabled ? 1 : 0.3,
                            flex: 1,
                        }}
                    >
                        ✅ I'm Back
                    </button>

                    {creditsEnabled && level < 3 && (
                        <button
                            onClick={() => {
                                if (mode === 'gentle' && level === 1) handleDelay(5, 0);
                                else if (mode === 'gentle') handleDelay(15, 30);
                                else if (mode === 'balanced' && level === 1) handleDelay(5, 20);
                                else handleDelay(15, 60);
                            }}
                            disabled={!buttonsEnabled}
                            style={{
                                ...btnBase,
                                background: 'rgba(255,255,255,0.05)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245,158,11,0.3)',
                                opacity: buttonsEnabled ? 1 : 0.3,
                                flex: 1,
                            }}
                        >
                            {mode === 'gentle' && level === 1 ? 'Give me 5 mins (free)'
                                : mode === 'gentle' ? 'Delay 15 min (30 💰)'
                                    : level === 1 ? 'Delay 5 min (20 💰)'
                                        : 'Delay 15 min (60 💰)'}
                        </button>
                    )}
                </div>

                {mode === 'balanced' && level >= 2 && (
                    <button
                        onClick={handleCloseApp}
                        disabled={!buttonsEnabled}
                        style={{
                            ...btnBase,
                            background: 'rgba(239,68,68,0.1)',
                            color: '#EF4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                            opacity: buttonsEnabled ? 1 : 0.3,
                            width: '100%',
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
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-slide-up { animation: slideUp 0.35s ease-out; }
                .animate-scale-in { animation: scaleIn 0.3s ease-out; }
            `}</style>

            {/* Full-screen backdrop */}
            <div style={{
                position: 'fixed', inset: 0,
                background: `rgba(0,0,0,${bgOpacity})`,
                display: 'flex',
                alignItems: isCenter ? 'center' : 'flex-end',
                justifyContent: isCenter ? 'center' : 'flex-end',
                padding: isCenter ? 0 : 32,
                pointerEvents: 'none',
            }}>
                {/* Intervention Card */}
                <div
                    className={cardAnim}
                    onMouseEnter={handleCardEnter}
                    onMouseLeave={handleCardLeave}
                    style={{
                        ...cardStyle,
                        maxWidth: 420,
                        width: '100%',
                        border: `1px solid ${borderColor}`,
                        animation: mode === 'strict' ? 'scaleIn 0.3s ease-out' : 'slideUp 0.35s ease-out',
                        boxShadow: mode === 'strict'
                            ? '0 0 60px rgba(239,68,68,0.2)'
                            : '0 8px 40px rgba(0,0,0,0.4)',
                        pointerEvents: 'auto',
                        cursor: 'default',
                    }}
                >
                    {/* App header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>🔴</span>
                        <span style={{
                            fontSize: 14, fontWeight: 700, letterSpacing: '0.5px',
                            color: mode === 'strict' ? '#FF4444' : '#F59E0B',
                        }}>
                            {appName || 'Unknown App'}
                        </span>
                    </div>

                    {/* Message */}
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
                        "{message}"
                    </p>

                    {/* Task */}
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        📋 Your task: "{task}"
                    </p>

                    {/* Countdown */}
                    {countdown !== null && countdown > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>⏱</span>
                            <span style={{
                                fontSize: 26, fontWeight: 700, fontFamily: 'monospace',
                                color: countdown <= 5 ? '#EF4444' : '#F59E0B',
                            }}>
                                {countdown}s
                            </span>
                        </div>
                    )}

                    {/* Streak at risk */}
                    {streakMins >= 5 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>🔥</span>
                            <span style={{
                                fontSize: 14, fontWeight: 600,
                                color: streakMins >= 30 ? '#EF4444' : streakMins >= 15 ? '#F97316' : '#F59E0B',
                            }}>
                                Streak at risk: {streakMins} mins
                            </span>
                        </div>
                    )}

                    {/* Distraction count */}
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        You've been distracted{' '}
                        <span style={{
                            fontWeight: 700,
                            color: (distractionCount || 0) > 3 ? '#EF4444' : 'rgba(255,255,255,0.6)',
                        }}>
                            {distractionCount || 0}
                        </span>{' '}
                        times this session.
                    </p>

                    {renderButtons()}
                </div>
            </div>
        </>
    );
}

const btnBase = {
    padding: '12px 16px',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
};

const cardStyle = {
    background: 'rgba(10,10,14,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 20,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
};
