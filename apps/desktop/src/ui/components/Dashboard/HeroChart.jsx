import React, { useState, useMemo } from 'react';
import CardGlass from '../CardGlass';
import ChipButton from '../ChipButton';
import { SkeletonStat, SkeletonChart } from '../SkeletonLoader';
import colors from '../../../data/config/colors';

/**
 * Format a number as currency.
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Hero chart card — large conversion line chart with stat numbers and month pills.
 *
 * @param {{
 *   stats: { revenue: number, expenses: number, totalRevenue: number },
 *   timeseries: Array<{ ts: number, value: number }>,
 *   months: string[],
 *   selectedMonth: string | null,
 *   onMonthSelect: (month: string) => void,
 *   loading?: boolean,
 * }} props
 */
export default function HeroChart({ stats, timeseries, months, selectedMonth, onMonthSelect, loading }) {
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // Chart dimensions
    const chartWidth = 600;
    const chartHeight = 200;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };

    // Build SVG path from timeseries
    const { linePath, areaPath, points } = useMemo(() => {
        if (!timeseries || timeseries.length === 0) {
            return { linePath: '', areaPath: '', points: [] };
        }

        const values = timeseries.map(d => d.value);
        const maxVal = Math.max(...values, 1);
        const minVal = Math.min(...values, 0);
        const range = maxVal - minVal || 1;

        const w = chartWidth - padding.left - padding.right;
        const h = chartHeight - padding.top - padding.bottom;

        const pts = timeseries.map((d, i) => ({
            x: padding.left + (i / Math.max(1, timeseries.length - 1)) * w,
            y: padding.top + h - ((d.value - minVal) / range) * h,
            value: d.value,
            ts: d.ts,
        }));

        // Smooth curve
        let line = `M${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const cpx = (prev.x + curr.x) / 2;
            line += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
        }

        // Area path (fill under curve)
        const area = `${line} L${pts[pts.length - 1].x},${chartHeight} L${pts[0].x},${chartHeight} Z`;

        return { linePath: line, areaPath: area, points: pts };
    }, [timeseries]);

    if (loading) {
        return (
            <CardGlass className="p-5 flex flex-col gap-4">
                <div className="flex gap-6">
                    <SkeletonStat />
                    <SkeletonStat />
                    <SkeletonStat />
                </div>
                <SkeletonChart />
            </CardGlass>
        );
    }

    return (
        <CardGlass className="p-5 flex flex-col gap-4">
            {/* Stat row */}
            <div className="flex flex-wrap gap-6 sm:gap-8">
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-400 mb-1">Revenue</p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {formatCurrency(stats.revenue)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-400 mb-1">Expenses</p>
                    <p className="text-3xl font-extrabold text-amber-500 tracking-tight">
                        {formatCurrency(stats.expenses)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-400 mb-1">Total revenue</p>
                    <p className="text-3xl font-extrabold text-emerald-500 tracking-tight">
                        {formatCurrency(stats.totalRevenue)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="relative w-full">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={colors.chart.line} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={colors.chart.line} stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={colors.accent.purple} />
                            <stop offset="100%" stopColor={colors.accent.violet} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Area fill */}
                    {areaPath && (
                        <path d={areaPath} fill="url(#heroFill)" />
                    )}

                    {/* Line stroke */}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="url(#heroStroke)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            filter="url(#glow)"
                        />
                    )}

                    {/* Data points */}
                    {points.map((pt, i) => (
                        <circle
                            key={i}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPoint === i ? 5 : 3}
                            fill={colors.chart.line}
                            stroke="white"
                            strokeWidth={hoveredPoint === i ? 2 : 0}
                            className="transition-all duration-150 cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                        />
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredPoint !== null && points[hoveredPoint] && (
                    <div
                        className="absolute pointer-events-none z-10
                       bg-gray-900 dark:bg-gray-800 text-white text-xs
                       px-3 py-1.5 rounded-lg shadow-lg
                       -translate-x-1/2 -translate-y-full"
                        style={{
                            left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
                            top: `${(points[hoveredPoint].y / chartHeight) * 100}%`,
                        }}
                    >
                        {formatCurrency(points[hoveredPoint].value)}
                    </div>
                )}
            </div>

            {/* Month pills */}
            <div className="flex flex-wrap gap-2">
                {months.map((month) => (
                    <ChipButton
                        key={month}
                        label={month}
                        active={selectedMonth === month}
                        onClick={() => onMonthSelect(month)}
                    />
                ))}
            </div>
        </CardGlass>
    );
}
