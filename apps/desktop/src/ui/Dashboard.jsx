import React, { useEffect, useCallback, useRef } from 'react';
import useDashboardStore from './store/dashboardStore';
import useUiStore from './store/uiStore';
import TopNav from './components/Dashboard/TopNav';
import PageTitleRow from './components/Dashboard/PageTitleRow';
import HeroChart from './components/Dashboard/HeroChart';
import LeadsBarCard from './components/Dashboard/LeadsBarCard';
import SmallStatCard from './components/Dashboard/SmallStatCard';
import DonutCard from './components/Dashboard/DonutCard';
import ConversionCard from './components/Dashboard/ConversionCard';
import {
    sampleStats,
    sampleTimeseries,
    sampleMonths,
    sampleWeeklyLeads,
    sampleDonut,
    sampleSmallStats,
    sampleConversionCluster,
} from '../data/dashboardData';

/**
 * Format a number as compact currency string.
 */
function formatCompact(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: 'compact',
    }).format(value);
}

/**
 * Dashboard page — glassmorphic responsive grid layout.
 *
 * @param {{ onBack?: () => void, onSettingsClick?: () => void }} props
 */
export default function Dashboard({ onBack, onSettingsClick }) {
    const {
        stats,
        timeseries,
        months,
        selectedMonth,
        weeklyLeads,
        donut,
        smallStats,
        loading,
        error,
        setSelectedMonth,
        fetchDashboard,
    } = useDashboardStore();

    const { selectedDate } = useUiStore();
    const debounceRef = useRef(null);

    // Fetch data on mount
    useEffect(() => {
        fetchDashboard();

        // Subscribe to IPC events
        const cleanups = [];

        if (window.electron?.on) {
            const cleanupSession = window.electron.on('sessionUpdate', () => {
                fetchDashboard();
            });
            if (cleanupSession) cleanups.push(cleanupSession);

            const cleanupCredit = window.electron.on('creditUpdate', () => {
                fetchDashboard();
            });
            if (cleanupCredit) cleanups.push(cleanupCredit);
        }

        return () => {
            cleanups.forEach((fn) => fn());
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Handle month selection with debounce
    const handleMonthSelect = useCallback(
        (month) => {
            setSelectedMonth(month);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchDashboard();
            }, 300);
        },
        [setSelectedMonth, fetchDashboard]
    );

    // Use real data if available, fallback to samples
    const hasData = timeseries.length > 0;
    const displayStats = hasData ? stats : sampleStats;
    const displayTimeseries = hasData ? timeseries : sampleTimeseries;
    const displayMonths = hasData && months.length > 0 ? months : sampleMonths;
    const displaySelectedMonth = selectedMonth || displayMonths[displayMonths.length - 1];
    const displayWeeklyLeads = hasData && weeklyLeads.length > 0 ? weeklyLeads : sampleWeeklyLeads;
    const displayDonut = hasData && donut.slices?.length > 0 ? donut : sampleDonut;
    const displaySmallStats = hasData ? smallStats : sampleSmallStats;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0b0b0d]">
            {/* Top nav */}
            <TopNav />

            {/* Page title row */}
            <PageTitleRow onBack={onBack} onSettingsClick={onSettingsClick} />

            {/* Main content — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
                {/* Error banner */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20
                          flex items-center justify-between">
                        <span className="text-sm text-red-500">{error}</span>
                        <button
                            onClick={() => fetchDashboard()}
                            className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                            aria-label="Retry loading dashboard data"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fade-in">

                    {/* Row 1: Hero chart (left, wide) + Leads bar (right) */}
                    <div className="md:col-span-7">
                        <HeroChart
                            stats={displayStats}
                            timeseries={displayTimeseries}
                            months={displayMonths}
                            selectedMonth={displaySelectedMonth}
                            onMonthSelect={handleMonthSelect}
                            loading={loading}
                        />
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-4">
                        <LeadsBarCard
                            weeklyLeads={displayWeeklyLeads}
                            selectedDate={selectedDate}
                            onDayClick={(day) => {
                                console.log('[Dashboard] Day clicked:', day);
                            }}
                            onDetailsClick={() => {
                                console.log('[Dashboard] Details clicked');
                            }}
                            loading={loading}
                        />
                    </div>

                    {/* Row 2: Three bottom cards */}
                    <div className="md:col-span-4">
                        <ConversionCard data={sampleConversionCluster} />
                    </div>

                    <div className="md:col-span-4">
                        <div className="grid grid-cols-2 gap-4">
                            <SmallStatCard
                                title="Conversion"
                                value={`${displaySmallStats.conversion}%`}
                                delta="12%"
                                deltaPositive={true}
                                icon="📈"
                            />
                            <SmallStatCard
                                title="Expenses"
                                value={formatCompact(displaySmallStats.expenses)}
                                delta="3%"
                                deltaPositive={false}
                                icon="💸"
                            />
                            <SmallStatCard
                                title="Revenue"
                                value={formatCompact(displaySmallStats.totalRevenue)}
                                delta="8%"
                                deltaPositive={true}
                                icon="💰"
                                className="col-span-2"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-4">
                        <DonutCard donut={displayDonut} loading={loading} />
                    </div>
                </div>

                {/* Empty state */}
                {!loading && !error && !hasData && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            Showing sample data. Start a focus session to see your real stats!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
