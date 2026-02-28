import { create } from 'zustand';

/**
 * Dashboard data store — holds stats, timeseries, leads, donut, and filter state.
 * Data is fetched via IPC on mount and when filters change.
 */
const useDashboardStore = create((set, get) => ({
    // --- Data ---
    stats: { revenue: 0, expenses: 0, totalRevenue: 0 },
    timeseries: [],
    months: [],
    selectedMonth: null,
    weeklyLeads: [],
    donut: { centerPct: 0, slices: [] },
    smallStats: { conversion: 0, expenses: 0, totalRevenue: 0 },

    // --- Loading / Error ---
    loading: false,
    error: null,

    // --- Actions ---
    setStats: (payload) => set({ stats: payload }),
    setTimeseries: (arr) => set({ timeseries: arr }),
    setMonths: (arr) => set({ months: arr }),
    setSelectedMonth: (m) => set({ selectedMonth: m }),
    setWeeklyLeads: (arr) => set({ weeklyLeads: arr }),
    setDonut: (obj) => set({ donut: obj }),
    setSmallStats: (obj) => set({ smallStats: obj }),
    setLoading: (val) => set({ loading: val }),
    setError: (val) => set({ error: val }),

    /**
     * Fetch dashboard data from IPC, aggregate sessions into stats.
     */
    fetchDashboard: async () => {
        try {
            set({ loading: true, error: null });

            const [sessions, credits] = await Promise.all([
                window.electron?.ipc?.getSessions?.() ?? [],
                window.electron?.ipc?.getCredits?.() ?? 0,
            ]);

            const sessionList = sessions || [];
            const balance = credits || 0;

            // Aggregate stats from sessions
            const totalFocusSecs = sessionList.reduce((a, s) => a + (s.total_focus_seconds || 0), 0);
            const totalCreditsEarned = sessionList.reduce((a, s) => a + (s.credits_earned || 0), 0);

            const revenue = balance;
            const expenses = totalCreditsEarned > 0 ? Math.round(totalCreditsEarned * 0.3) : 0;
            const totalRevenue = totalCreditsEarned;

            set({
                stats: { revenue, expenses, totalRevenue },
                smallStats: {
                    conversion: sessionList.length > 0
                        ? Math.round((sessionList.filter(s => (s.total_focus_seconds || 0) > 300).length / sessionList.length) * 100)
                        : 0,
                    expenses,
                    totalRevenue,
                },
            });

            // Build timeseries from sessions
            const ts = sessionList
                .filter(s => s.started_at)
                .map(s => ({
                    ts: s.started_at,
                    value: s.total_focus_seconds || 0,
                }))
                .sort((a, b) => a.ts - b.ts);
            set({ timeseries: ts });

            // Build weekly leads (group by day of week)
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayMap = {};
            days.forEach(d => { dayMap[d] = { day: d, value: 0, capacity: 0 }; });

            sessionList.forEach(s => {
                if (!s.started_at) return;
                const date = new Date(s.started_at);
                const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
                if (dayMap[dayName]) {
                    dayMap[dayName].value += s.total_focus_seconds || 0;
                    dayMap[dayName].capacity += (s.ended_at && s.started_at)
                        ? (s.ended_at - s.started_at) / 1000
                        : 3600;
                }
            });
            set({ weeklyLeads: days.map(d => dayMap[d]) });

            // Build donut from focus quality distribution
            const good = sessionList.filter(s => {
                const dur = s.ended_at && s.started_at ? (s.ended_at - s.started_at) / 1000 : 1;
                return ((s.total_focus_seconds || 0) / Math.max(1, dur)) >= 0.7;
            }).length;
            const ok = sessionList.filter(s => {
                const dur = s.ended_at && s.started_at ? (s.ended_at - s.started_at) / 1000 : 1;
                const pct = (s.total_focus_seconds || 0) / Math.max(1, dur);
                return pct >= 0.5 && pct < 0.7;
            }).length;
            const poor = sessionList.length - good - ok;
            const total = sessionList.length || 1;

            set({
                donut: {
                    centerPct: sessionList.length > 0 ? Math.round((good / total) * 100) : 0,
                    slices: [
                        { label: 'Focused', pct: Math.round((good / total) * 100) },
                        { label: 'Moderate', pct: Math.round((ok / total) * 100) },
                        { label: 'Distracted', pct: Math.round((poor / total) * 100) },
                    ],
                },
            });

            // Build months list from sessions
            const monthSet = new Set();
            sessionList.forEach(s => {
                if (!s.started_at) return;
                const d = new Date(s.started_at);
                monthSet.add(d.toLocaleString('default', { month: 'short' }));
            });
            const monthsList = [...monthSet];
            if (monthsList.length === 0) {
                const now = new Date();
                monthsList.push(now.toLocaleString('default', { month: 'short' }));
            }
            set({ months: monthsList, selectedMonth: monthsList[monthsList.length - 1] });

        } catch (err) {
            console.error('[dashboardStore] fetchDashboard error:', err);
            set({ error: 'Failed to load dashboard data' });
        } finally {
            set({ loading: false });
        }
    },
}));

export default useDashboardStore;
