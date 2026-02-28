import React, { useState, useEffect } from 'react';
import useSessionStore from './store/sessionStore';

/**
 * Settings page — Focus mode selector, customization, and app rules.
 */
export default function Settings({ onBack }) {
    const {
        mode,
        setMode,
        isSessionLocked,
        blurIntensity,
        toastPosition,
        forceCloseDelay,
        soundAlert,
        appWhitelist,
        appBlacklist,
        loadSettings,
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
            id: 'gentle',
            label: '🟢 Gentle',
            desc: 'Nudges only\nNo force close',
            color: '#22C55E',
            border: 'border-green-500/40',
        },
        {
            id: 'balanced',
            label: '🟡 Balanced',
            desc: 'Nudges +\nsoft close',
            tag: '(default)',
            color: '#F59E0B',
            border: 'border-amber-500/40',
        },
        {
            id: 'strict',
            label: '🔴 Strict',
            desc: 'Full enforce\nForce kill\nNo credits',
            color: '#EF4444',
            border: 'border-red-500/40',
        },
    ];

    const cardBase = 'rounded-xl p-4 border transition-all duration-300 cursor-pointer';
    const cardSelected = 'bg-white/[0.06] backdrop-blur-xl';
    const cardUnselected = 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]';

    return (
        <div className="p-5 flex flex-col gap-5 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="text-sm px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                >
                    ← Back
                </button>
                <h1 className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Settings
                </h1>
            </div>

            {/* Section: Focus Mode */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Focus Mode
                </h2>
                <div className="grid grid-cols-3 gap-3">
                    {modes.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => !isSessionLocked && setLocalMode(m.id)}
                            className={`${cardBase} ${localMode === m.id ? `${cardSelected} ${m.border}` : cardUnselected} ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={localMode === m.id ? { borderTopColor: m.color, borderTopWidth: '2px' } : {}}
                        >
                            <p className="text-sm font-bold mb-1" style={{ color: m.color }}>{m.label}</p>
                            {m.tag && <p className="text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.tag}</p>}
                            <p className="text-[10px] whitespace-pre-line leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{m.desc}</p>
                            <p className="text-[10px] mt-2 font-medium" style={{ color: localMode === m.id ? m.color : 'rgba(255,255,255,0.25)' }}>
                                {localMode === m.id ? 'Selected ✓' : 'Select'}
                            </p>
                        </div>
                    ))}
                </div>
                {isSessionLocked && (
                    <p className="text-[10px] mt-2" style={{ color: '#F59E0B' }}>
                        ⚠ Mode is locked until your current session ends
                    </p>
                )}
            </section>

            {/* Section: Strict Mode Settings */}
            {localMode === 'strict' && (
                <section className="rounded-xl p-4 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.03)' }}>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#EF4444' }}>
                        Strict Mode Settings
                    </h2>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Force close after:</span>
                            <div className="flex gap-2">
                                {[15, 30, 60].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setLocalForceDelay(s)}
                                        className="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer"
                                        style={{
                                            background: localForceDelay === s ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                                            color: localForceDelay === s ? '#EF4444' : 'rgba(255,255,255,0.4)',
                                            border: `1px solid ${localForceDelay === s ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                        }}
                                    >
                                        {s}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Section: Session Lock */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Session Lock
                </h2>
                <div className="flex items-center justify-between rounded-xl p-3 border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex-1">
                        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Lock mode during sessions</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Once a session starts, mode cannot be changed until it ends. Recommended for Strict mode.
                        </p>
                    </div>
                    <button
                        onClick={() => setModeLocked(!modeLocked)}
                        className="ml-3 w-10 h-5 rounded-full relative transition-all cursor-pointer"
                        style={{ background: modeLocked ? '#22C55E' : 'rgba(255,255,255,0.1)' }}
                    >
                        <div
                            className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                            style={{
                                background: 'white',
                                left: modeLocked ? '22px' : '2px',
                            }}
                        />
                    </button>
                </div>
            </section>

            {/* Section: Notification Preferences */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Notification Preferences
                </h2>
                <div className="flex flex-col gap-3">
                    {/* Blur intensity */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Blur intensity:</span>
                        <div className="flex gap-1">
                            {['light', 'medium', 'heavy', 'blackout'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setLocalBlur(opt)}
                                    className="px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer capitalize"
                                    style={{
                                        background: localBlur === opt ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                                        color: localBlur === opt ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                                        border: `1px solid ${localBlur === opt ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toast position */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Toast position:</span>
                        <div className="flex gap-1">
                            {[
                                { value: 'bottom-right', label: 'Bottom Right' },
                                { value: 'top-center', label: 'Top Center' },
                                { value: 'center', label: 'Center' },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setLocalToastPos(opt.value)}
                                    className="px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer"
                                    style={{
                                        background: localToastPos === opt.value ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                                        color: localToastPos === opt.value ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                                        border: `1px solid ${localToastPos === opt.value ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sound alert toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Sound alert:</span>
                        <button
                            onClick={() => setLocalSound(!localSound)}
                            className="w-10 h-5 rounded-full relative transition-all cursor-pointer"
                            style={{ background: localSound ? '#22C55E' : 'rgba(255,255,255,0.1)' }}
                        >
                            <div
                                className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                                style={{
                                    background: 'white',
                                    left: localSound ? '22px' : '2px',
                                }}
                            />
                        </button>
                    </div>
                </div>
            </section>

            {/* Section: App Rules */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    App Rules
                </h2>

                {/* Whitelist */}
                <div className="mb-3">
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Always Allow (whitelist):</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {localWhitelist.map((app) => (
                            <span
                                key={app}
                                className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                            >
                                {app}
                                <button
                                    onClick={() => setLocalWhitelist(localWhitelist.filter(a => a !== app))}
                                    className="cursor-pointer hover:opacity-70"
                                >×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newWhitelistApp}
                            onChange={(e) => setNewWhitelistApp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
                            placeholder="App name"
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-white/[0.06] outline-none"
                            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)' }}
                        />
                        <button
                            onClick={addToWhitelist}
                            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
                        >
                            + Add
                        </button>
                    </div>
                </div>

                {/* Blacklist */}
                <div>
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Always Block (blacklist):</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {localBlacklist.map((app) => (
                            <span
                                key={app}
                                className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                {app}
                                <button
                                    onClick={() => setLocalBlacklist(localBlacklist.filter(a => a !== app))}
                                    className="cursor-pointer hover:opacity-70"
                                >×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newBlacklistApp}
                            onChange={(e) => setNewBlacklistApp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addToBlacklist()}
                            placeholder="App name"
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-white/[0.06] outline-none"
                            style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)' }}
                        />
                        <button
                            onClick={addToBlacklist}
                            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        >
                            + Add
                        </button>
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer mt-2"
                style={{
                    background: saveStatus === 'saved' ? '#22C55E' : 'rgba(245,158,11,0.15)',
                    color: saveStatus === 'saved' ? 'white' : '#F59E0B',
                    border: `1px solid ${saveStatus === 'saved' ? '#22C55E' : 'rgba(245,158,11,0.3)'}`,
                }}
            >
                {saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Error — Try again' : '💾 Save Settings'}
            </button>
        </div>
    );
}
