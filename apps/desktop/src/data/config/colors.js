/**
 * CognitionX color palette — mirrors Tailwind @theme tokens.
 * Use these for programmatic coloring (SVG charts, dynamic styles).
 */
const colors = {
    primary: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
        950: '#2e1065',
    },
    accent: {
        purple: '#6b40ff',
        orange: '#f97316',
        orangeDeep: '#ea580c',
        emerald: '#34d399',
        violet: '#8b5cf6',
    },
    surface: {
        light: {
            page: '#f8fafc',
            card: '#ffffff',
            cardHover: '#f1f5f9',
            muted: '#f1f5f9',
        },
        dark: {
            page: '#0b0b0d',
            card: 'rgba(17, 17, 21, 0.6)',
            cardHover: 'rgba(30, 30, 38, 0.7)',
            muted: '#1e1e26',
        },
    },
    text: {
        light: {
            primary: '#0f172a',
            secondary: '#475569',
            muted: '#94a3b8',
        },
        dark: {
            primary: '#f1f5f9',
            secondary: '#cbd5e1',
            muted: '#64748b',
        },
    },
    chart: {
        line: '#6b40ff',
        lineFill: 'rgba(107, 64, 255, 0.08)',
        barStart: '#f97316',
        barEnd: '#ea580c',
        donut: ['#34d399', '#8b5cf6', '#f97316'],
    },
    status: {
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
    },
};

export default colors;
