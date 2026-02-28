import React, { useState, useEffect } from 'react';
import useSessionStore from './store/sessionStore';

/**
 * Settings page — Focus mode selector, customization, and app rules.
 * Landscape layout: 2 columns (Mode/Lock on left, Prefs/Rules on right).
 */
export default function Settings({ onBack }) {
    const {
        mode, setMode, isSessionLocked, blurIntensity, toastPosition,
        forceCloseDelay, soundAlert, appWhitelist, appBlacklist, loadSettings,
    } = useSessionStore();

    const [localMode, setLocalMode] = useState(mode);
    const [localBlur, setLocalBlur] = useState(blurIntensity);
    const [localToastPos, setLocalToastPos] = useState(toastPosition);
    const [localForceDelay, setLocalForceDelay] = useState(forceCloseDelay);
    const [localSound, setLocalSound] = useState(soundAlert);
    const [localWhitelist, setLocalWhitelist] = useState(appWhitelist);
    const [localBlacklist, setLocalBlacklist] = useState(appBlacklist);
    const [modeLocked, setModeLocked] = useState(false);
    const [newWhitelistApp, setNewWhitelistApp] = useState('');
    const [newBlacklistApp, setNewBlacklistApp] = useState('');
    const [saveStatus, setSaveStatus] = useState(null);

    // Load settings on mount
    useEffect(() => {
        (async () => {
            try {
                const settings = await window.electron?.ipc?.getAllSettings();
                if (settings) {
                    loadSettings(settings);
                    setLocalMode(settings.intervention_mode || 'balanced');
                    setLocalBlur(settings.blur_intensity || 'medium');
                    setLocalToastPos(settings.toast_position || 'bottom-right');
                    setLocalForceDelay(parseInt(settings.force_close_delay, 10) || 30);
                    setLocalSound(settings.sound_alert === 'true');
                    setLocalWhitelist(JSON.parse(settings.app_whitelist || '[]'));
                    setLocalBlacklist(JSON.parse(settings.app_blacklist || '[]'));
                    setModeLocked(settings.mode_locked === 'true');
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        })();
    }, []);

    const handleSave = async () => {
        try {
            const data = {
                intervention_mode: localMode,
                blur_intensity: localBlur,
                toast_position: localToastPos,
                force_close_delay: String(localForceDelay),
                sound_alert: String(localSound),
                mode_locked: String(modeLocked),
                app_whitelist: JSON.stringify(localWhitelist),
                app_blacklist: JSON.stringify(localBlacklist),
            };
            const result = await window.electron?.ipc?.saveSettings(data);
            if (result?.success) {
                setMode(localMode);
                loadSettings(data);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 2000);
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            setSaveStatus('error');
        }
    };

    const addToWhitelist = () => {
        const app = newWhitelistApp.trim();
        if (app && !localWhitelist.includes(app)) {
            setLocalWhitelist([...localWhitelist, app]);
            setNewWhitelistApp('');
        }
    };

    const addToBlacklist = () => {
        const app = newBlacklistApp.trim();
        if (app && !localBlacklist.includes(app)) {
            setLocalBlacklist([...localBlacklist, app]);
            setNewBlacklistApp('');
        }
    };

    const modes = [
        {
            id: 'gentle', label: '🟢 Gentle', desc: 'Nudges only\nNo force close',
            color: 'text-emerald-500', border: 'border-emerald-500/40', accent: '#22C55E'
        },
        {
            id: 'balanced', label: '🟡 Balanced', desc: 'Nudges +\nsoft close',
            tag: '(default)', color: 'text-amber-500', border: 'border-amber-500/40', accent: '#F59E0B'
        },
        {
            id: 'strict', label: '🔴 Strict', desc: 'Full enforce\nForce kill\nNo credits',
            color: 'text-red-500', border: 'border-red-500/40', accent: '#EF4444'
        },
    ];

    return (
        <div className="p-6 h-full flex flex-col gap-6 w-full max-w-6xl mx-auto animate-fade-in animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-sm px-4 py-2 rounded-lg transition-all cursor-pointer font-medium
                                   bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]
                                   text-gray-600 dark:text-gray-300"
                    >
                        ← Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                        Settings
                    </h1>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer
                        ${saveStatus === 'saved'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : saveStatus === 'error'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20'
                        }`}
                >
                    {saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error — Try again' : '💾 Save Settings'}
                </button>
            </div>

            {/* 2-Column Layout */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 pb-6">

                {/* LEFT COLUMN: Mode & Lock */}
                <div className="flex flex-col gap-8">
                    {/* Section: Focus Mode */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-gray-400">
                            Focus Mode
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {modes.map((m) => (
                                <div
                                    key={m.id}
                                    onClick={() => !isSessionLocked && setLocalMode(m.id)}
                                    className={`rounded-xl p-4 border transition-all duration-300 ${!isSessionLocked ? 'cursor-pointer' : 'cursor-not-allowed'}
                                        ${localMode === m.id
                                            ? `bg-white dark:bg-white/[0.06] shadow-sm ${m.border}`
                                            : `bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.04] ${isSessionLocked ? 'opacity-50' : 'opacity-100'}`
                                        }`}
                                    style={localMode === m.id ? { borderTopColor: m.accent, borderTopWidth: '2px' } : {}}
                                >
                                    <p className={`text-sm font-bold mb-1 ${m.color}`}>{m.label}</p>
                                    {m.tag && <p className="text-[10px] mb-2 text-gray-400">{m.tag}</p>}
                                    <p className="text-xs whitespace-pre-line leading-relaxed text-gray-500 dark:text-gray-400">{m.desc}</p>
                                </div>
                            ))}
                        </div>
                        {isSessionLocked && (
                            <p className="text-xs mt-3 font-medium text-amber-500">
                                ⚠ Mode is locked until your current session ends
                            </p>
                        )}
                    </section>

                    {/* Section: Session Lock */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-gray-400">
                            Session Lock
                        </h2>
                        <div className="flex items-center justify-between rounded-xl p-5 border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Lock mode during sessions</p>
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm">
                                    Once a session starts, the intervention mode cannot be changed until it ends. Highly recommended for Strict mode.
                                </p>
                            </div>
                            <button
                                onClick={() => setModeLocked(!modeLocked)}
                                className={`ml-4 w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0
                                    ${modeLocked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/[0.1]'}`}
                            >
                                <div
                                    className="w-5 h-5 rounded-full absolute top-0.5 transition-all bg-white shadow-sm"
                                    style={{ left: modeLocked ? '26px' : '2px' }}
                                />
                            </button>
                        </div>
                    </section>

                    {/* Strict Mode Extras */}
                    {localMode === 'strict' && (
                        <section className="rounded-xl p-5 border border-red-500/20 bg-red-50 dark:bg-red-500/5">
                            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-red-500">
                                Strict Mode Settings
                            </h2>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-red-900 dark:text-red-200">Force close app after:</span>
                                <div className="flex gap-2">
                                    {[15, 30, 60].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setLocalForceDelay(s)}
                                            className={`px-4 py-1.5 rounded-lg text-sm transition-all cursor-pointer font-medium
                                                ${localForceDelay === s
                                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/40'
                                                    : 'bg-white dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            {s}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* RIGHT COLUMN: App Rules & Prefs */}
                <div className="flex flex-col gap-8">
                    {/* Section: App Rules */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-gray-400">
                            App Rules (Whitelist / Blacklist)
                        </h2>

                        {/* Whitelist */}
                        <div className="mb-6">
                            <p className="text-sm font-bold mb-2 text-gray-800 dark:text-gray-200">Always Allow (Whitelist)</p>
                            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">These apps will never trigger distractions.</p>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {localWhitelist.length === 0 && <span className="text-xs italic text-gray-400">No apps whitelisted</span>}
                                {localWhitelist.map((app) => (
                                    <span
                                        key={app}
                                        className="text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium
                                                   bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 
                                                   border border-emerald-200 dark:border-emerald-500/20"
                                    >
                                        {app}
                                        <button
                                            onClick={() => setLocalWhitelist(localWhitelist.filter(a => a !== app))}
                                            className="cursor-pointer hover:text-emerald-800 dark:hover:text-emerald-200"
                                        >×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newWhitelistApp}
                                    onChange={(e) => setNewWhitelistApp(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
                                    placeholder="e.g. Code.exe, Obsidian.exe"
                                    className="flex-1 text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-white/[0.06] outline-none
                                               bg-white dark:bg-white/[0.03] text-gray-800 dark:text-gray-200
                                               focus:border-emerald-400 dark:focus:border-emerald-500 focus:bg-gray-50 dark:focus:bg-white/[0.05]"
                                />
                                <button
                                    onClick={addToWhitelist}
                                    className="text-sm px-4 py-2 rounded-xl cursor-pointer transition-all font-semibold
                                               bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400
                                               hover:bg-emerald-200 dark:hover:bg-emerald-500/20"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        {/* Blacklist */}
                        <div>
                            <p className="text-sm font-bold mb-2 text-gray-800 dark:text-gray-200">Always Block (Blacklist)</p>
                            <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">These apps are always treated as severe distractions.</p>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {localBlacklist.length === 0 && <span className="text-xs italic text-gray-400">No apps blacklisted</span>}
                                {localBlacklist.map((app) => (
                                    <span
                                        key={app}
                                        className="text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium
                                                   bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 
                                                   border border-red-200 dark:border-red-500/20"
                                    >
                                        {app}
                                        <button
                                            onClick={() => setLocalBlacklist(localBlacklist.filter(a => a !== app))}
                                            className="cursor-pointer hover:text-red-800 dark:hover:text-red-200"
                                        >×</button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newBlacklistApp}
                                    onChange={(e) => setNewBlacklistApp(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addToBlacklist()}
                                    placeholder="e.g. Discord.exe, Steam.exe"
                                    className="flex-1 text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-white/[0.06] outline-none
                                               bg-white dark:bg-white/[0.03] text-gray-800 dark:text-gray-200
                                               focus:border-red-400 dark:focus:border-red-500 focus:bg-gray-50 dark:focus:bg-white/[0.05]"
                                />
                                <button
                                    onClick={addToBlacklist}
                                    className="text-sm px-4 py-2 rounded-xl cursor-pointer transition-all font-semibold
                                               bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400
                                               hover:bg-red-200 dark:hover:bg-red-500/20"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gray-200 dark:bg-gray-800 my-2" />

                    {/* Section: Notification Preferences */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-gray-400">
                            Notification Preferences
                        </h2>
                        <div className="flex flex-col gap-4">
                            {/* Blur intensity */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Background Blur:</span>
                                <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
                                    {['light', 'medium', 'heavy', 'blackout'].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setLocalBlur(opt)}
                                            className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer capitalize font-medium
                                                ${localBlur === opt
                                                    ? 'bg-white dark:bg-white/[0.1] text-violet-600 dark:text-violet-400 shadow-sm'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.05]'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sound alert toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Play sound on intervention:</span>
                                <button
                                    onClick={() => setLocalSound(!localSound)}
                                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer shrink-0
                                        ${localSound ? 'bg-violet-500' : 'bg-gray-300 dark:bg-white/[0.1]'}`}
                                >
                                    <div
                                        className="w-5 h-5 rounded-full absolute top-0.5 transition-all bg-white shadow-sm"
                                        style={{ left: localSound ? '26px' : '2px' }}
                                    />
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
