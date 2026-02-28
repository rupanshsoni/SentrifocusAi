import React from 'react';

/**
 * Small outlined CTA button for card actions.
 *
 * @param {{ label?: string, onClick?: Function }} props
 */
export default function DetailsButton({ label = 'Details', onClick }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full
                 text-xs font-medium
                 border border-gray-300 dark:border-gray-600
                 text-gray-600 dark:text-gray-300
                 hover:bg-gray-100 dark:hover:bg-gray-700/40
                 transition-all duration-150 ease-out cursor-pointer"
            aria-label={label}
        >
            <span>{label}</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}
