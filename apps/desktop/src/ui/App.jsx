import React, { useState, useEffect } from 'react';
import SessionStart from './SessionStart';
import ActiveSession from './ActiveSession';
import Dashboard from './Dashboard';

/**
 * Main App component — routes between views.
 * Views: 'start' | 'active' | 'dashboard' | 'summary'
 */
export default function App() {
    const [view, setView] = useState('start');
    const [sessionData, setSessionData] = useState(null);
    const [summaryData, setSummaryData] = useState(null);

    useEffect(() => {
        // Listen for session events from main process
        const cleanupStarted = window.electron.on('sessionStarted', (data) => {
            setSessionData(data);
            setView('active');
        });

        const cleanupEnded = window.electron.on('sessionEnded', (data) => {
            setSummaryData(data);
            setView('summary');
        });

        return () => {
            if (cleanupStarted) cleanupStarted();
            if (cleanupEnded) cleanupEnded();
        };
    }, []);

    const handleStartSession = async (task) => {
        const result = await window.electron.ipc.startSession(task);
        if (result) {
            setSessionData(result);
            setView('active');
        }
    };

    const handleStopSession = async () => {
        const summary = await window.electron.ipc.stopSession();
        if (summary) {
            setSummaryData(summary);
            setView('summary');
        }
    };

    const handleGoToDashboard = () => setView('dashboard');
    const handleGoToStart = () => {
        setSummaryData(null);
        setView('start');
    };

    return (
        <div className="h-full flex flex-col" style={{ background: 'var(--cx-bg-primary)' }}>
            {/* Title bar */}
            <div
                className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ borderBottom: '1px solid var(--cx-border)' }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--cx-text-primary)' }}>
                        CognitionX
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {view !== 'dashboard' && (
                        <button
                            onClick={handleGoToDashboard}
                            className="p-1.5 rounded-md text-xs transition-colors cursor-pointer"
                            style={{ color: 'var(--cx-text-muted)' }}
                            title="Dashboard"
                        >
                            📊
                        </button>
                    )}
                    <button
                        onClick={() => window.electron.ipc.minimizeWindow()}
                        className="p-1.5 rounded-md text-xs transition-colors cursor-pointer"
                        style={{ color: 'var(--cx-text-muted)' }}
                        title="Minimize"
                    >
                        ─
                    </button>
                    <button
                        onClick={() => window.electron.ipc.closeWindow()}
                        className="p-1.5 rounded-md text-xs transition-colors cursor-pointer"
                        style={{ color: 'var(--cx-text-muted)' }}
                        title="Close to tray"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'start' && (
                    <SessionStart onStart={handleStartSession} />
                )}

                {view === 'active' && (
                    <ActiveSession
                        task={sessionData?.task}
                        onStop={handleStopSession}
                    />
                )}

                {view === 'summary' && summaryData && (
                    <SummaryView data={summaryData} onDone={handleGoToStart} />
                )}

                {view === 'dashboard' && (
                    <Dashboard onBack={handleGoToStart} />
                )}
            </div>
        </div>
    );
}

/**
 * Session summary card shown after ending a session.
 * @param {{ data: object, onDone: () => void }} props
 */
function SummaryView({ data, onDone }) {
    const focusPercent = data.focusPercent || 0;
    const totalMin = Math.floor((data.totalSeconds || 0) / 60);
    const focusMin = Math.floor((data.focusSeconds || 0) / 60);

    const barColor = focusPercent >= 70
        ? 'var(--cx-success)'
        : focusPercent >= 50
            ? 'var(--cx-warning)'
            : 'var(--cx-danger)';

    return (
        <div className="p-6 flex flex-col items-center gap-6 animate-slide-up">
            <span className="text-4xl">🎉</span>
            <h2 className="text-xl font-bold" style={{ color: 'var(--cx-text-primary)' }}>
                Session Complete!
            </h2>

            <div
                className="w-full rounded-xl p-5 flex flex-col gap-4"
                style={{ background: 'var(--cx-bg-card)', border: '1px solid var(--cx-border)' }}
            >
                <p className="text-sm" style={{ color: 'var(--cx-text-secondary)' }}>
                    📋 {data.task}
                </p>

                {/* Focus bar */}
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span style={{ color: 'var(--cx-text-muted)' }}>Focus Quality</span>
                        <span className="font-semibold" style={{ color: barColor }}>{focusPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--cx-bg-primary)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${focusPercent}%`, background: barColor }}
                        />
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                    <StatBox label="Total Time" value={`${totalMin} min`} />
                    <StatBox label="Focus Time" value={`${focusMin} min`} />
                    <StatBox label="Credits Earned" value={`+${data.creditsEarned || 0}`} accent />
                    <StatBox label="Interventions" value={data.interventionsCount || 0} />
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cx-text-secondary)' }}>
                💰 Total Balance: <span className="font-bold" style={{ color: 'var(--cx-accent-light)' }}>{data.creditsBalance || 0} credits</span>
            </div>

            <button
                onClick={onDone}
                className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-colors cursor-pointer"
                style={{ background: 'var(--cx-accent)' }}
                onMouseOver={(e) => e.target.style.background = 'var(--cx-accent-hover)'}
                onMouseOut={(e) => e.target.style.background = 'var(--cx-accent)'}
            >
                New Session
            </button>
        </div>
    );
}

/**
 * @param {{ label: string, value: string|number, accent?: boolean }} props
 */
function StatBox({ label, value, accent }) {
    return (
        <div className="rounded-lg p-3 text-center" style={{ background: 'var(--cx-bg-primary)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--cx-text-muted)' }}>{label}</p>
            <p
                className="text-lg font-bold"
                style={{ color: accent ? 'var(--cx-accent-light)' : 'var(--cx-text-primary)' }}
            >
                {value}
            </p>
        </div>
    );
}
