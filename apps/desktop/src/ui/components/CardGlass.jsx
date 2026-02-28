import React from 'react';

/**
 * Reusable glassmorphic card wrapper.
 * Applies rounded corners, subtle glass-like background, border, and shadow.
 *
 * @param {{ children: React.ReactNode, className?: string, onClick?: Function }} props
 */
export default function CardGlass({ children, className = '', onClick }) {
    return (
        <div
            onClick={onClick}
            className={`
        rounded-2xl
        bg-white/90 dark:bg-[rgba(20,20,28,0.65)]
        backdrop-blur-xl
        border border-gray-200 dark:border-white/10
        shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
        transition-all duration-200 ease-out
        hover:shadow-md dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]
        hover:border-gray-300 dark:hover:border-white/15
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
}
