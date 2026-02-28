import React, { useState, useMemo } from 'react';
import CardGlass from '../CardGlass';
import SkeletonLoader from '../SkeletonLoader';
import colors from '../../../data/config/colors';

const DONUT_COLORS = colors.chart.donut;

/**
 * Donut chart card — circular donut with center percentage and metric chips.
 *
 * @param {{
 *   donut: { centerPct: number, slices: Array<{ label: string, pct: number }> },
 *   loading?: boolean,
 * }} props
 */
export default function DonutCard({ donut, loading }) {
    const [hoveredSlice, setHoveredSlice] = useState(null);

    const size = 120;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const cx = size / 2;
    const cy = size / 2;

    const arcs = useMemo(() => {
        if (!donut?.slices?.length) return [];
        let offset = 0;
        return donut.slices.map((slice, i) => {
            const dash = (slice.pct / 100) * circumference;
            const gap = circumference - dash;
            const arc = {
                dash,
                gap,
                offset: -offset + circumference * 0.25, // start from top
                color: DONUT_COLORS[i % DONUT_COLORS.length],
                label: slice.label,
                pct: slice.pct,
            };
            offset += dash;
            return arc;
        });
    }, [donut, circumference]);

    if (loading) {
        return (
            <CardGlass className="p-5 flex flex-col items-center gap-4">
                <SkeletonLoader variant="circle" />
                <div className="flex gap-3">
                    <SkeletonLoader className="h-6 w-16" />
                    <SkeletonLoader className="h-6 w-16" />
                    <SkeletonLoader className="h-6 w-16" />
                </div>
            </CardGlass>
        );
    }

    return (
        <CardGlass className="p-5 flex flex-col items-center gap-4">
            <h3 className="self-start text-lg font-semibold text-gray-900 dark:text-gray-100">
                Focus quality
            </h3>

            {/* Donut SVG */}
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                    {/* Background ring */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-gray-100 dark:text-gray-700/40"
                    />
                    {/* Slices */}
                    {arcs.map((arc, i) => (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth={hoveredSlice === i ? strokeWidth + 3 : strokeWidth}
                            strokeDasharray={`${arc.dash} ${arc.gap}`}
                            strokeDashoffset={arc.offset}
                            strokeLinecap="round"
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredSlice(i)}
                            onMouseLeave={() => setHoveredSlice(null)}
                        />
                    ))}
                </svg>

                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                        {donut.centerPct > 0 ? '+' : ''}{donut.centerPct}%
                    </span>
                </div>

                {/* Tooltip on hover */}
                {hoveredSlice !== null && arcs[hoveredSlice] && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2
                          bg-gray-900 dark:bg-gray-800 text-white
                          text-xs px-3 py-1 rounded-lg shadow-lg pointer-events-none z-10">
                        {arcs[hoveredSlice].label}: {arcs[hoveredSlice].pct}%
                    </div>
                )}
            </div>

            {/* Metric chips */}
            <div className="flex flex-wrap gap-2 justify-center">
                {donut.slices.map((slice, i) => (
                    <div
                        key={slice.label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-gray-50 dark:bg-gray-700/40
                       text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span>{slice.label}</span>
                        <span className="font-bold">{slice.pct}%</span>
                    </div>
                ))}
            </div>
        </CardGlass>
    );
}
