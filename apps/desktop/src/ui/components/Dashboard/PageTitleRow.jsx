import React from 'react';
import DateChip from '../DateChip';
import useUiStore from '../../store/uiStore';

/**
 * Page title row with "Leads overview" heading, date chip, and right-side controls.
 *
 * @param {{ onSettingsClick?: Function, onBack?: Function }} props
 */
export default function PageTitleRow({ onSettingsClick, onBack }) {
    const { selectedDate, setSelectedDate, platformSelected, setPlatformSelected } = useUiStore();

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-6">
            {/* Left: back + title + date */}
            <div className="flex items-center gap-3 min-w-0">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="shrink-0 p-1.5 rounded-lg
                       text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-white/10
                       transition-all duration-150 cursor-pointer"
                        aria-label="Go back"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight truncate">
                    Leads overview
                </h1>
                <DateChip
                    date={selectedDate}
                    onClick={() => setSelectedDate(new Date().toISOString())}
                />
            </div>

            {/* Right: platform select + settings + avatar */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Platform select pill */}
                <select
                    value={platformSelected}
                    onChange={(e) => setPlatformSelected(e.target.value)}
                    className="h-8 px-3 rounded-full text-xs font-medium
                     bg-gray-100 dark:bg-white/10
                     text-gray-600 dark:text-gray-300
                     border-none outline-none cursor-pointer"
                    aria-label="Select platform"
                >
                    <option value="all">All platforms</option>
                    <option value="meta">Meta</option>
                    <option value="google">Google</option>
                    <option value="linkedin">LinkedIn</option>
                </select>

                {/* Settings icon */}
                {onSettingsClick && (
                    <button
                        onClick={onSettingsClick}
                        className="p-2 rounded-full
                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-white/10
                       transition-all duration-150 cursor-pointer"
                        aria-label="Settings"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                )}

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500
                        flex items-center justify-center text-white text-xs font-bold shrink-0">
                    CX
                </div>
            </div>
        </div>
    );
}
