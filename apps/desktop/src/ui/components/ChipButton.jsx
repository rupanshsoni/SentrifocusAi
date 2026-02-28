import React from 'react';

/**
 * Small rounded pill / chip button for month selection and quick filters.
 *
 * @param {{ label: string, active?: boolean, disabled?: boolean, onClick?: Function }} props
 */
export default function ChipButton({ label, active = false, disabled = false, onClick }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`
        inline-flex items-center justify-center
        h-8 px-3 rounded-full
        text-xs font-medium
        transition-all duration-150 ease-out
        cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/60'
                }
      `}
        >
            {label}
        </button>
    );
}
