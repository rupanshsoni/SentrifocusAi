import React, { useState, useEffect } from 'react';

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * CountdownApp — 180×180 circular SVG countdown timer.
 * Shows large number counting down, circular progress arc draining,
 * app name below. Amber → red color transition, accelerating pulse.
 */
export default function CountdownApp() {
    const [visible, setVisible] = useState(false);
    const [total, setTotal] = useState(30);
    const [remaining, setRemaining] = useState(30);
    const [appName, setAppName] = useState('');

    useEffect(() => {
        const bridge = window.overlayBridge;
        if (!bridge) return;

        bridge.onCountdownShow((data) => {
            setTotal(data.seconds);
            setRemaining(data.seconds);
            setAppName(data.appName || '');
            setVisible(true);
        });

        bridge.onCountdownTick((data) => {
            setRemaining(data.remaining);
        });

        bridge.onCountdownHide(() => {
            setVisible(false);
        });
    }, []);

    if (!visible) return null;

    const progress = total > 0 ? remaining / total : 0;
    const dashOffset = CIRCUMFERENCE * (1 - progress);
    const isUrgent = remaining <= total / 2;
    const color = isUrgent ? '#EF4444' : '#F59E0B';
    const pulseSpeed = remaining <= 5 ? '0.4s' : remaining <= 10 ? '0.8s' : '1.5s';

    return (
        <>
            <style>{`
                @keyframes countPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `}</style>

            <div style={{
                width: 180, height: 180,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,10,14,0.88)',
                borderRadius: '50%',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `2px solid ${color}40`,
                animation: `countPulse ${pulseSpeed} ease-in-out infinite`,
            }}>
                {/* SVG arc */}
                <svg width={160} height={160} style={{ position: 'absolute' }}>
                    {/* Background circle */}
                    <circle
                        cx={80} cy={80} r={RADIUS}
                        fill="none" stroke="rgba(255,255,255,0.06)"
                        strokeWidth={6}
                    />
                    {/* Progress arc */}
                    <circle
                        cx={80} cy={80} r={RADIUS}
                        fill="none" stroke={color}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 80 80)"
                        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s' }}
                    />
                </svg>

                {/* Number */}
                <span style={{
                    fontSize: 48, fontWeight: 800, fontFamily: 'monospace',
                    color, zIndex: 1,
                    textShadow: `0 0 20px ${color}60`,
                }}>
                    {remaining}
                </span>

                {/* App name */}
                <span style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.5)',
                    marginTop: -4, zIndex: 1,
                    textAlign: 'center', maxWidth: 120,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    Closing {appName}...
                </span>
            </div>
        </>
    );
}
