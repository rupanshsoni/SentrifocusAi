import React from 'react';
import CardGlass from '../CardGlass';
import colors from '../../../data/config/colors';

const BAR_COLORS = [
    colors.accent.purple,
    colors.accent.orange,
    colors.accent.emerald,
    colors.accent.violet,
];

/**
 * Conversion card — small bar cluster showing conversion category percentages.
 *
 * @param {{ data: Array<{ label: string, pct: number }>, title?: string }} props
 */
export default function ConversionCard({ data, title = 'Conversion' }) {
    const maxPct = Math.max(...data.map(d => d.pct), 1);

    return (
        <CardGlass className="p-4 flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
            </h3>

            <div className="flex flex-col gap-2.5">
                {data.map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 truncate">
                            {item.label}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700/30 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${(item.pct / maxPct) * 100}%`,
                                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                                }}
                            />
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-8 text-right">
                            {item.pct}%
                        </span>
                    </div>
                ))}
            </div>
        </CardGlass>
    );
}
