import React, { useState, useEffect } from 'react';

/**
 * FocusBarApp — thin 32px strip at top of screen.
 * Shows: CognitionX icon | current task | focus score + streak + credits
 * Color-coded left-border glow based on score.
 */
export default function FocusBarApp() {
    const [data, setData] = useState({
        score: 0, streak: 0, task: '', credits: 0,
    });

    useEffect(() => {
        const bridge = window.overlayBridge;
        if (!bridge) return;
        bridge.onFocusBarUpdate((d) => setData(d));
    }, []);

    const { score, streak, task, credits } = data;
    const streakMins = Math.floor((streak || 0) / 60);

    // Glow color based on score
    let glowColor = '#22C55E'; // green
    if (score < 40) glowColor = '#EF4444'; // red
    else if (score < 70) glowColor = '#F59E0B'; // amber

    const pulseClass = score < 40 ? 'bar-pulse' : '';

    return (
        <>
            <style>{`
                @keyframes barPulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                .bar-pulse { animation: barPulse 1.5s ease-in-out infinite; }
            `}</style>

            <div className={pulseClass} style={{
                width: '100vw', height: 32,
                background: 'rgba(10, 10, 14, 0.82)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center',
                padding: '0 16px',
                borderBottom: `2px solid ${glowColor}`,
                gap: 16,
                fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}>
                {/* Left: App icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 14 }}>🧠</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>
                        CognitionX
                    </span>
                </div>

                {/* Center: Task */}
                <div style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center',
                }}>
                    {task ? `📋 ${task.substring(0, 50)}` : ''}
                </div>

                {/* Right: Score + Streak + Credits */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{
                        fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                        color: glowColor,
                    }}>
                        {score}
                    </span>

                    {streakMins > 0 && (
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            background: 'rgba(255,255,255,0.08)',
                            padding: '2px 8px', borderRadius: 10,
                            color: '#F59E0B',
                        }}>
                            🔥 {streakMins}m
                        </span>
                    )}

                    <span style={{
                        fontSize: 11, fontWeight: 600,
                        background: 'rgba(139,92,246,0.15)',
                        padding: '2px 8px', borderRadius: 10,
                        color: '#A78BFA',
                    }}>
                        💰 {credits}
                    </span>
                </div>
            </div>
        </>
    );
}
