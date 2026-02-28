/**
 * Sample / fallback data for the dashboard.
 * Used when no real session data is available from the backend.
 */

export const sampleStats = {
    revenue: 33846,
    expenses: 12420,
    totalRevenue: 46266,
};

export const sampleTimeseries = [
    { ts: 1, value: 12000 },
    { ts: 2, value: 18000 },
    { ts: 3, value: 14000 },
    { ts: 4, value: 22000 },
    { ts: 5, value: 19000 },
    { ts: 6, value: 26000 },
    { ts: 7, value: 31000 },
    { ts: 8, value: 28000 },
    { ts: 9, value: 33000 },
    { ts: 10, value: 30000 },
    { ts: 11, value: 35000 },
    { ts: 12, value: 33846 },
];

export const sampleMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const sampleWeeklyLeads = [
    { day: 'Mon', value: 120000, capacity: 300000 },
    { day: 'Tue', value: 180000, capacity: 300000 },
    { day: 'Wed', value: 240000, capacity: 300000 },
    { day: 'Thu', value: 90000, capacity: 300000 },
    { day: 'Fri', value: 200000, capacity: 300000 },
    { day: 'Sat', value: 60000, capacity: 300000 },
    { day: 'Sun', value: 30000, capacity: 300000 },
];

export const sampleDonut = {
    centerPct: 24,
    slices: [
        { label: 'Focused', pct: 54 },
        { label: 'Moderate', pct: 28 },
        { label: 'Distracted', pct: 18 },
    ],
};

export const sampleSmallStats = {
    conversion: 67,
    expenses: 12420,
    totalRevenue: 46266,
};

export const sampleConversionCluster = [
    { label: 'Direct', pct: 42 },
    { label: 'Organic', pct: 31 },
    { label: 'Referral', pct: 18 },
    { label: 'Social', pct: 9 },
];
