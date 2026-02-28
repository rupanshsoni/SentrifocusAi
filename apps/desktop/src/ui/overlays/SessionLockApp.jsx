import React, { useState, useEffect } from 'react';

/**
 * SessionLockApp — fullscreen warning overlay for strict mode lock override.
 * Requires typing "OVERRIDE" to confirm. 5-second delay on destructive button.
 */
export default function SessionLockApp() {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState({ reason: '', endsAt: '' });
    const [overrideText, setOverrideText] = useState('');
    const [btnEnabled, setBtnEnabled] = useState(false);

    useEffect(() => {
        const bridge = window.overlayBridge;
        if (!bridge) return;

        bridge.onSessionLockShow((d) => {
            setData(d);
            setVisible(true);
            setOverrideText('');
            setBtnEnabled(false);
            setTimeout(() => setBtnEnabled(true), 5000);
        });

        bridge.onSessionLockHide(() => {
            setVisible(false);
        });
    }, []);

    if (!visible) return null;

    const canOverride = btnEnabled && overrideText === 'OVERRIDE';

    const handleCardEnter = () => window.overlayBridge?.sessionLockCaptureMouse();
    const handleCardLeave = () => window.overlayBridge?.sessionLockReleaseMouse();

    const handleStayFocused = () => {
        window.overlayBridge?.sessionLockStayFocused();
    };

    const handleOverride = () => {
        if (canOverride) {
            window.overlayBridge?.sessionLockOverride();
        }
    };

    const reasonText = {
        'mode_change': 'You tried to change the intervention mode during a locked session.',
        'quit': 'You tried to quit the app during a locked session.',
        'end_session': 'You tried to end the session before it was scheduled to finish.',
    }[data.reason] || 'You are trying to override your own rules.';

    return (
        <>
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <div
                    onMouseEnter={handleCardEnter}
                    onMouseLeave={handleCardLeave}
                    style={{
                        maxWidth: 440, width: '100%',
                        background: 'rgba(10,10,14,0.95)',
                        backdropFilter: 'blur(24px)',
                        borderRadius: 20, padding: 32,
                        border: '1px solid rgba(239,68,68,0.3)',
                        boxShadow: '0 0 60px rgba(239,68,68,0.15)',
                        display: 'flex', flexDirection: 'column', gap: 20,
                        animation: 'scaleIn 0.3s ease-out',
                        pointerEvents: 'auto', cursor: 'default',
                    }}
                >
                    {/* Warning icon */}
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 48 }}>⚠️</span>
                    </div>

                    <h2 style={{
                        fontSize: 22, fontWeight: 800, textAlign: 'center',
                        color: '#EF4444',
                    }}>
                        Session is Locked
                    </h2>

                    <p style={{
                        fontSize: 14, color: 'rgba(255,255,255,0.7)',
                        textAlign: 'center', lineHeight: 1.6,
                    }}>
                        {reasonText}
                    </p>

                    {data.endsAt && (
                        <p style={{
                            fontSize: 12, color: 'rgba(255,255,255,0.4)',
                            textAlign: 'center',
                        }}>
                            Your session ends at <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{data.endsAt}</strong>
                        </p>
                    )}

                    <p style={{
                        fontSize: 13, color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center', fontStyle: 'italic',
                    }}>
                        Are you sure you want to override your own rules?
                    </p>

                    {/* Stay Focused button */}
                    <button
                        onClick={handleStayFocused}
                        style={{
                            width: '100%', padding: '14px 0',
                            borderRadius: 12, border: 'none',
                            background: '#22C55E', color: 'white',
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        ✅ Stay Focused
                    </button>

                    {/* Override section */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 10,
                        padding: 16, borderRadius: 12,
                        background: 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            Type <strong style={{ color: '#EF4444' }}>OVERRIDE</strong> to confirm:
                        </p>
                        <input
                            type="text"
                            value={overrideText}
                            onChange={(e) => setOverrideText(e.target.value)}
                            placeholder="Type OVERRIDE"
                            style={{
                                width: '100%', padding: '10px 12px',
                                borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#EF4444', fontSize: 14, fontWeight: 600,
                                fontFamily: 'monospace', letterSpacing: 2,
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleOverride}
                            disabled={!canOverride}
                            style={{
                                width: '100%', padding: '12px 0',
                                borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                                background: canOverride ? '#EF4444' : 'rgba(239,68,68,0.1)',
                                color: canOverride ? 'white' : 'rgba(239,68,68,0.3)',
                                fontSize: 13, fontWeight: 600,
                                cursor: canOverride ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s',
                            }}
                        >
                            {btnEnabled ? 'Override — End Session' : 'Wait 5s...'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
