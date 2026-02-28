import React from 'react';
import useUiStore from '../../store/uiStore';
import ThemeSwitch from '../ThemeSwitch';

const NAV_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'resources', label: 'Resources', icon: '📁' },
];

/**
 * Horizontal nav bar with rounded pill tabs and theme switch.
 */
export default function TopNav() {
    const { activeTab, setActiveTab } = useUiStore();

    return (
        <div className="flex items-center justify-between px-4 py-3">
            {/* Pill tab bar */}
            <div className="flex items-center gap-1 p-1 rounded-full
                      bg-gray-100 dark:bg-white/[0.06]">
                {NAV_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        aria-label={tab.label}
                        className={`
              flex items-center gap-1.5 h-9 px-4 rounded-full
              text-xs font-medium whitespace-nowrap
              transition-all duration-150 ease-out cursor-pointer
              ${activeTab === tab.id
                                ? 'bg-white dark:bg-white/90 text-gray-900 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/10'
                            }
            `}
                    >
                        <span className="text-sm">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Right side: theme switch */}
            <div className="flex items-center gap-2">
                <ThemeSwitch />
            </div>
        </div>
    );
}
