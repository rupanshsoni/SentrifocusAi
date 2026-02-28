import React, { useState, useEffect } from 'react';
import SessionStart from './SessionStart';
import ActiveSession from './ActiveSession';
import Dashboard from './Dashboard';
import Settings from './Settings';

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
                <div className="flex items-center justify-between px-4 py-3 shrink-0
                                bg-white/50 dark:bg-black/20 backdrop-blur-sm
                                border-b border-gray-200 dark:border-gray-800 z-10">
                    <div className="flex items-center gap-2 drag-region w-full">
                        <span className="text-xl">🧠</span>
                        <span className="text-sm font-extrabold tracking-wide text-gray-900 dark:text-gray-100">
                            CognitionX
                        </span>
                    </div>

                    <div className="flex items-center gap-2 no-drag ml-auto">
                        {view !== 'settings' && (
                            <button
                                onClick={handleGoToDashboard}
                                className="p-2 rounded-lg text-sm transition-all cursor-pointer font-medium
                                           bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                                           text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                title="Dashboard"
                                aria-label="Open Dashboard"
                            >
                                📊 Dashboard
                            </button>
                        )}
                        {view !== 'settings' && (
                            <button
                                onClick={() => setView('settings')}
                                className="p-2 rounded-lg text-sm transition-all cursor-pointer
                                           bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                                           text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                                title="Settings"
                                aria-label="Open Settings"
                            >
                                ⚙️
                            </button>
                        )}
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
                        <button
                            onClick={() => window.electron?.ipc?.minimizeWindow()}
                            className="p-2 rounded-lg text-sm transition-all cursor-pointer
                                       text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10"
                            title="Minimize"
                            aria-label="Minimize window"
                        >
                            ─
                        </button>
                        <button
                            onClick={() => window.electron?.ipc?.closeWindow()}
                            className="p-2 rounded-lg text-sm transition-all cursor-pointer
                                       text-gray-500 hover:bg-red-500 hover:text-white dark:text-gray-400 dark:hover:bg-red-500"
                            title="Close to tray"
                            aria-label="Close to tray"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 overflow-y-auto no-drag relative">
                {/* Subtle background glow effect */}
                {view !== 'dashboard' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] 
                                    bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
                )}

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

            {/* Interventions are now rendered in dedicated overlay BrowserWindows */}
        </div>
    );
}

/**
 * Session summary card shown after ending a session.
 * Redesigned for landscape layout.
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
        <div className="flex items-center justify-center h-full p-8 animate-slide-up">
            <div className="w-full max-w-2xl flex flex-col items-center gap-6">
                <span className="text-6xl animate-bounce">🎉</span>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50">
                    Session Complete!
                </h2>

                <div className="w-full rounded-2xl p-8 flex flex-col gap-6
                                bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08]
                                shadow-xl shadow-black/5 dark:shadow-none">
                    <p className="text-base text-gray-600 dark:text-gray-400 font-medium text-center bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/[0.04]">
                        📋 {data.task}
                    </p>

                    {/* Focus bar */}
                    <div className="bg-gray-50 dark:bg-white/[0.02] p-5 rounded-xl border border-gray-100 dark:border-white/[0.04]">
                        <div className="flex justify-between text-sm mb-2 font-semibold">
                            <span className="text-gray-500 dark:text-gray-400">Focus Quality</span>
                            <span className={textColorClass}>{focusPercent}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${barColorClass}`}
                                style={{ width: `${focusPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatBox label="Total Time" value={`${totalMin} min`} />
                        <StatBox label="Focus Time" value={`${focusMin} min`} />
                        <StatBox label="Credits Earned" value={`+${data.creditsEarned || 0}`} accent />
                        <StatBox label="Interventions" value={data.interventionsCount || 0} />
                    </div>
                </div>

                <div className="flex items-center justify-between w-full max-w-2xl px-2 mt-2">
                    <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium bg-white dark:bg-white/[0.03] px-4 py-2 rounded-xl border border-gray-200 dark:border-white/[0.06]">
                        💰 Total Balance: <span className="font-bold text-violet-500 text-base">{data.creditsBalance || 0}</span>
                    </p>

                    <button
                        onClick={onDone}
                        className="px-8 py-3 rounded-xl font-bold text-sm text-white
                                   bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30
                                   transition-all cursor-pointer"
                    >
                        Start Next Session →
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * @param {{ label: string, value: string|number, accent?: boolean }} props
 */
function StatBox({ label, value, accent }) {
    return (
        <div className="rounded-xl p-4 text-center bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.04]">
            <p className="text-xs mb-1.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-bold ${accent ? 'text-violet-500' : 'text-gray-900 dark:text-gray-100'}`}>
                {value}
            </p>
        </div>
    );
}
