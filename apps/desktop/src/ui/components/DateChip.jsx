import React from 'react';

/**
 * Small rounded chip that shows a calendar icon + formatted date.
 *
 * @param {{ date: string, onClick?: Function }} props
 */
export default function DateChip({ date, onClick }) {
    const formatted = (() => {
        try {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'Select date';
        }
    })();

    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full
                 bg-gray-100 dark:bg-gray-700/60
                 text-xs font-medium text-gray-600 dark:text-gray-300
                 hover:bg-gray-200 dark:hover:bg-gray-600/60
                 transition-all duration-150 ease-out cursor-pointer"
            aria-label={`Selected date: ${formatted}`}
        >
            {/* Calendar icon */}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatted}</span>
        </button>
    );
}
