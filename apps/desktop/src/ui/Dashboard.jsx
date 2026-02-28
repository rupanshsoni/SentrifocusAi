import React, { useState, useEffect } from 'react';

/**
 * Dashboard view — session history and stats.
 * @param {{ onBack: () => void }} props
 */
export default function Dashboard({ onBack }) {
    const [sessions, setSessions] = useState([]);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [sessionList, balance] = await Promise.all([
                window.electron.ipc.getSessions(),
                window.electron.ipc.getCredits(),
            ]);
            setSessions(sessionList || []);
            setCredits(balance || 0);
        } catch (err) {
            setError('Failed to load data');
            console.error('[Dashboard]', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Aggregate stats
    const todaySessions = sessions.filter((s) => {
        const today = new Date();
        const sessionDate = new Date(s.started_at);
        return sessionDate.toDateString() === today.toDateString();
    });

    const todayFocusMin = todaySessions.reduce(
        (acc, s) => acc + (s.total_focus_seconds || 0), 0
    );
    const todayCredits = todaySessions.reduce(
        (acc, s) => acc + (s.credits_earned || 0), 0
    );

    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
            `, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className="p-5 flex flex-col gap-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-1.5 rounded-md transition-colors cursor-pointer"
                    style={{ color: 'var(--cx-text-muted)' }}
                >
                    ← Back
                </button>
                <h2 className="text-lg font-bold" style={{ color: 'var(--cx-text-primary)' }}>
                    Dashboard
                </h2>
            </div>

            {/* Today's Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--cx-bg-card)', border: '1px solid var(--cx-border)' }}
                >
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Today Focus</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--cx-success)' }}>
                        {formatDuration(todayFocusMin)}
                    </p>
                </div>
                <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--cx-bg-card)', border: '1px solid var(--cx-border)' }}
                >
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Today Credits</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--cx-accent-light)' }}>
                        +{todayCredits}
                    </p>
                </div>
                <div
                    className="rounded-xl p-4 text-center"
                    style={{ background: 'var(--cx-bg-card)', border: '1px solid var(--cx-border)' }}
                >
                    <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>Balance</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--cx-warning)' }}>
                        💰{credits}
                    </p>
                </div>
            </div>

            {/* Session History */}
            <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cx-text-secondary)' }}>
                    Recent Sessions
                </h3>

                {loading && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--cx-text-muted)' }}>
                        Loading...
                    </p>
                )}

                {error && (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--cx-danger)' }}>
                        {error}
                    </p>
                )}

                {!loading && !error && sessions.length === 0 && (
                    <div className="text-center py-8">
                        <span className="text-3xl mb-2 block">📭</span>
                        <p className="text-sm" style={{ color: 'var(--cx-text-muted)' }}>
                            No sessions yet. Start your first focus session!
                        </p>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {sessions.slice(0, 10).map((s) => {
                        const focusPercent = s.ended_at && s.total_focus_seconds
                            ? Math.round(
                                (s.total_focus_seconds /
                                    Math.max(1, (s.ended_at - s.started_at) / 1000)) *
                                100
                            )
                            : 0;

                        const barColor = focusPercent >= 70
                            ? 'var(--cx-success)'
                            : focusPercent >= 50
                                ? 'var(--cx-warning)'
                                : 'var(--cx-danger)';

                        return (
                            <div
                                key={s.id}
                                className="rounded-lg p-3"
                                style={{ background: 'var(--cx-bg-secondary)', border: '1px solid var(--cx-border)' }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium truncate flex-1 mr-2" style={{ color: 'var(--cx-text-primary)' }}>
                                        {s.task_text}
                                    </p>
                                    <span className="text-xs shrink-0" style={{ color: 'var(--cx-text-muted)' }}>
                                        {formatDate(s.started_at)}
                                    </span>
                                </div>

                                {/* Focus bar */}
                                <div className="w-full h-1.5 rounded-full mb-2" style={{ background: 'var(--cx-bg-primary)' }}>
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${Math.min(100, focusPercent)}%`, background: barColor }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs" style={{ color: 'var(--cx-text-muted)' }}>
                                    <span style={{ color: barColor }}>{focusPercent}% focused</span>
                                    <span>+{s.credits_earned || 0} credits</span>
                                    {s.interventions_count > 0 && (
                                        <span>⚡{s.interventions_count} nudges</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
