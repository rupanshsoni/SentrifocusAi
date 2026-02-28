import { create } from 'zustand';

/**
 * UI state store — global UI state for navigation, date selection, etc.
 */
const useUiStore = create((set) => ({
    activeTab: 'dashboard',
    selectedDate: new Date().toISOString(),
    platformSelected: 'all',

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedDate: (date) => set({ selectedDate: date }),
    setPlatformSelected: (platform) => set({ platformSelected: platform }),
}));

export default useUiStore;
