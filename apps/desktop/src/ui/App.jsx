import React, { useState, useEffect } from 'react';
import SessionStart from './SessionStart';
import ActiveSession from './ActiveSession';
import Dashboard from './Dashboard';
import Settings from './Settings';
import InterventionOverlay from './components/InterventionOverlay';

/**
 * Main App component — routes between views.
 * Views: 'start' | 'active' | 'dashboard' | 'summary' | 'settings'
 */
export default function App() {
    const [view, setView] = useState('start');
    const [sessionData, setSessionData] = useState(null);
    const [summaryData, setSummaryData] = useState(null);

    // Initialize dark mode from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('cx-theme');
        if (stored === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        // Listen for session events from main process
        const cleanupStarted = window.electron?.on('sessionStarted', (data) => {
            setSessionData(data);
            setView('active');
        });

        const cleanupEnded = window.electron?.on('sessionEnded', (data) => {
            setSummaryData(data);
            setView('summary');
        });

        return () => {
            if (cleanupStarted) cleanupStarted();
            if (cleanupEnded) cleanupEnded();
        };
    }, []);

    const handleStartSession = async (task) => {
        const result = await window.electron?.ipc?.startSession(task);
        if (result) {
            setSessionData(result);
            setView('active');
        }
    };

    const handleStopSession = async () => {
        const summary = await window.electron?.ipc?.stopSession();
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
        <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0b0b0d] text-gray-900 dark:text-gray-100">
            {/* Title bar — shown on non-dashboard views */}
            {view !== 'dashboard' && (
                <div className="flex items-center justify-between px-4 py-2 shrink-0
                                border-b border-gray-200 dark:border-gray-700/30">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🧠</span>
                        <span className="text-sm font-bold tracking-wide text-gray-900 dark:text-gray-100">
                            CognitionX
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {view !== 'settings' && (
                            <button
                                onClick={handleGoToDashboard}
                                className="p-1.5 rounded-md text-xs transition-colors cursor-pointer
                                           text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                title="Dashboard"
                                aria-label="Open Dashboard"
                            >
                                📊
                            </button>
                        )}
                        {view !== 'settings' && (
                            <button
                                onClick={() => setView('settings')}
                                className="p-1.5 rounded-md text-xs transition-colors cursor-pointer
                                           text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                title="Settings"
                                aria-label="Open Settings"
                            >
                                ⚙️
                            </button>
                        )}
                        <button
                            onClick={() => window.electron?.ipc?.minimizeWindow()}
                            className="p-1.5 rounded-md text-xs transition-colors cursor-pointer
                                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            title="Minimize"
                            aria-label="Minimize window"
                        >
                            ─
                        </button>
                        <button
                            onClick={() => window.electron?.ipc?.closeWindow()}
                            className="p-1.5 rounded-md text-xs transition-colors cursor-pointer
                                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            title="Close to tray"
                            aria-label="Close to tray"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

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
                    <Dashboard
                        onBack={handleGoToStart}
                        onSettingsClick={() => setView('settings')}
                    />
                )}

                {view === 'settings' && (
                    <Settings onBack={() => setView('start')} />
                )}
            </div>

            {/* Intervention Overlay — always rendered, hidden by default */}
            <InterventionOverlay />
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

    const barColorClass = focusPercent >= 70
        ? 'bg-emerald-500'
        : focusPercent >= 50
            ? 'bg-amber-500'
            : 'bg-red-500';

    const textColorClass = focusPercent >= 70
        ? 'text-emerald-500'
        : focusPercent >= 50
            ? 'text-amber-500'
            : 'text-red-500';

    return (
        <div className="p-6 flex flex-col items-center gap-6 animate-slide-up">
            <span className="text-4xl">🎉</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Session Complete!
            </h2>

            <div className="w-full rounded-xl p-5 flex flex-col gap-4
                            bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    📋 {data.task}
                </p>

                {/* Focus bar */}
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Focus Quality</span>
                        <span className={`font-semibold ${textColorClass}`}>{focusPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                            style={{ width: `${focusPercent}%` }}
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

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                💰 Total Balance: <span className="font-bold text-violet-500">{data.creditsBalance || 0} credits</span>
            </div>

            <button
                onClick={onDone}
                className="w-full py-3 rounded-lg font-semibold text-sm text-white
                           bg-violet-600 hover:bg-violet-700
                           transition-colors cursor-pointer"
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
        <div className="rounded-lg p-3 text-center bg-gray-50 dark:bg-gray-800/60">
            <p className="text-xs mb-1 text-gray-400">{label}</p>
            <p className={`text-lg font-bold ${accent ? 'text-violet-500' : 'text-gray-900 dark:text-gray-100'}`}>
                {value}
            </p>
        </div>
    );
}
