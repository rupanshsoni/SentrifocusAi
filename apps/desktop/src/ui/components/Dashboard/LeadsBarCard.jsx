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
            <CardGlass className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-5 w-20" />
                    <div className="animate-shimmer rounded bg-gray-200 dark:bg-gray-700/40 h-5 w-24" />
                </div>
                <div className="flex items-end gap-2 h-36">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <SkeletonLoader key={i} variant="bar" className="flex-1" />
                    ))}
                </div>
            </CardGlass>
        );
    }

    const maxCapacity = Math.max(...weeklyLeads.map(d => d.capacity), 1);

    return (
        <CardGlass className="p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Leads
                </h3>
                <DateChip date={selectedDate} />
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-2 h-36">
                {weeklyLeads.map((entry) => {
                    const heightPct = (entry.value / maxCapacity) * 100;
                    const capacityPct = (entry.capacity / maxCapacity) * 100;

                    return (
                        <div
                            key={entry.day}
                            className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                            onClick={() => onDayClick?.(entry.day)}
                            role="button"
                            aria-label={`${entry.day}: ${entry.value} leads out of ${entry.capacity} capacity`}
                        >
                            {/* Bar container (capacity background + value fill) */}
                            <div className="relative w-full rounded-t-lg overflow-hidden" style={{ height: `${capacityPct}%` }}>
                                {/* Capacity striped background */}
                                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700/30 rounded-t-lg"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)',
                                    }}
                                />
                                {/* Value fill */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 rounded-t-lg
                             transition-all duration-300 ease-out
                             group-hover:opacity-90"
                                    style={{
                                        height: `${(entry.value / Math.max(entry.capacity, 1)) * 100}%`,
                                        background: `linear-gradient(to top, ${colors.accent.orangeDeep}, ${colors.accent.orange})`,
                                    }}
                                />
                            </div>

                            {/* Day label */}
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500
                              group-hover:text-amber-500 transition-colors duration-150">
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
