import React from 'react';
import CardGlass from '../CardGlass';

/**
 * Small stat card — shows a title, a big stat number, and optional delta.
 *
 * @param {{
 *   title: string,
 *   value: string | number,
 *   delta?: string,
 *   deltaPositive?: boolean,
 *   icon?: string,
 *   className?: string,
 * }} props
 */
export default function SmallStatCard({ title, value, delta, deltaPositive = true, icon, className = '' }) {
    return (
        <CardGlass className={`p-4 flex flex-col gap-2 ${className}`}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {title}
                </p>
                {icon && <span className="text-lg">{icon}</span>}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {value}
            </p>
            {delta && (
                <span className={`text-xs font-semibold ${deltaPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {deltaPositive ? '↑' : '↓'} {delta}
                </span>
            )}
        </CardGlass>
    );
}
