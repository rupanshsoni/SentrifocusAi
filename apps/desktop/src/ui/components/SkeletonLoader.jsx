import React from 'react';

/**
 * Animated skeleton shimmer placeholder for loading states.
 *
 * @param {{ className?: string, variant?: 'line'|'bar'|'circle'|'card' }} props
 */
export default function SkeletonLoader({ className = '', variant = 'line' }) {
    const baseClasses = 'animate-shimmer rounded-lg bg-gray-200 dark:bg-gray-700/40';

    const variants = {
        line: 'h-4 w-full',
        bar: 'h-24 w-8',
        circle: 'h-24 w-24 rounded-full',
        card: 'h-32 w-full rounded-2xl',
    };

    return (
        <div
            className={`${baseClasses} ${variants[variant] || variants.line} ${className}`}
            aria-hidden="true"
        />
    );
}

/**
 * Pre-built skeleton layout for a stat number.
 */
export function SkeletonStat() {
    return (
        <div className="flex flex-col gap-2">
            <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-3 w-16" />
            <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-8 w-24" />
        </div>
    );
}

/**
 * Pre-built skeleton layout for a chart area.
 */
export function SkeletonChart() {
    return (
        <div className="w-full h-48 animate-shimmer rounded-xl bg-gray-200 dark:bg-gray-700/40" />
    );
}
