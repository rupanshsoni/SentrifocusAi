import React, { useState, useEffect } from 'react';

/**
 * CreditNotificationApp — small floating pill toast.
 * Shows "+N credits" with reason. Slides in/out from right.
 */
export default function CreditNotificationApp() {
    const [visible, setVisible] = useState(false);
    const [data, setData] = useState({ amount: 0, reason: '' });
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const bridge = window.overlayBridge;
        if (!bridge) return;

        bridge.onCreditShow((d) => {
            setData(d);
            setExiting(false);
            setVisible(true);
        });

        bridge.onCreditHide(() => {
            setExiting(true);
            setTimeout(() => setVisible(false), 400);
        });
    }, []);

    if (!visible) return null;

    const reasonLabel = {
        'focus_block': '5-min focus block',
        'self_correction': 'Self-correction',
        'pomodoro_complete': 'Pomodoro complete',
    }[data.reason] || data.reason || 'Focus reward';

    return (
        <>
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(60px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideOutRight {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(60px); }
                }
            `}</style>

            <div style={{
                width: 240, height: 56,
                background: 'rgba(10,10,14,0.9)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 16,
                border: '1px solid rgba(139,92,246,0.3)',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 16px',
                boxShadow: '0 4px 20px rgba(139,92,246,0.2)',
                animation: exiting
                    ? 'slideOutRight 0.35s ease-in forwards'
                    : 'slideInRight 0.35s ease-out',
            }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{
                        fontSize: 15, fontWeight: 700,
                        color: '#A78BFA',
                    }}>
                        +{data.amount} credits
                    </span>
                    <span style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.45)',
                    }}>
                        {reasonLabel}
                    </span>
                </div>
            </div>
        </>
    );
}
