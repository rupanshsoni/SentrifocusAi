import React from 'react';
import CardGlass from '../CardGlass';
import DetailsButton from '../DetailsButton';
import DateChip from '../DateChip';
import SkeletonLoader from '../SkeletonLoader';
import colors from '../../../data/config/colors';

/**
 * Leads bar card — vertical bar chart with orange bars, day pills, and Details CTA.
 *
 * @param {{
 *   weeklyLeads: Array<{ day: string, value: number, capacity: number }>,
 *   selectedDate: string,
 *   onDayClick?: (day: string) => void,
 *   onDetailsClick?: () => void,
 *   loading?: boolean,
 * }} props
 */
export default function LeadsBarCard({ weeklyLeads, selectedDate, onDayClick, onDetailsClick, loading }) {
    if (loading) {
        return (
            <CardGlass className="p-5 flex flex-col gap-4 h-full">
                <div className="flex justify-between items-center">
                    <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-5 w-20" />
                    <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-5 w-24" />
                </div>
                <div className="flex items-end gap-2 flex-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="bar" className="flex-1" />
                    ))}
                </div>
            </CardGlass>
        );
    }

    const maxCapacity = Math.max(...weeklyLeads.map(d => d.capacity), 1);

    return (
        <CardGlass className="p-5 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Leads
                </h3>
                <DateChip date={selectedDate} />
            </div>

            {/* Bar chart area */}
            <div className="flex items-end gap-3 flex-1 min-h-[140px]">
                {weeklyLeads.map((entry) => {
                    const heightPct = Math.round((entry.value / maxCapacity) * 100);

                    return (
                        <div
                            key={entry.day}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full cursor-pointer group"
                            onClick={() => onDayClick?.(entry.day)}
                            role="button"
                            aria-label={`${entry.day}: ${entry.value} leads out of ${entry.capacity} capacity`}
                        >
                            {/* Bar wrapper — takes remaining vertical space */}
                            <div className="flex-1 w-full flex items-end">
                                <div
                                    className="w-full rounded-t-lg transition-all duration-300 ease-out
                                               group-hover:opacity-80"
                                    style={{
                                        height: `${heightPct}%`,
                                        minHeight: heightPct > 0 ? '4px' : '0',
                                        background: `linear-gradient(to top, ${colors.accent.orangeDeep}, ${colors.accent.orange})`,
                                    }}
                                />
                            </div>

                            {/* Day label */}
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500
                              group-hover:text-amber-500 transition-colors duration-150 shrink-0">
                                {entry.day}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex justify-end">
                <DetailsButton onClick={onDetailsClick} />
            </div>
        </CardGlass>
    );
}
