// NFZ Appointment Finder - Configuration and State Management
export const CONFIG = {
    BASE_URL: 'https://api.nfz.gov.pl/app-itl-api',
    RESULTS_PER_PAGE: 5,
    DEFAULT_REFRESH_INTERVAL: 60, // minutes
    MIN_BENEFIT_SEARCH_LENGTH: 3,
    BENEFIT_SEARCH_DEBOUNCE: 300, // ms
    TEST_NOTIFICATION_INTERVAL: 30000, // 30 seconds
    GEOLOCATION_TIMEOUT: 10000,
    API_LIMIT: 25
};

// Global state object
export const state = {
    currentResults: [],
    filteredResults: [],
    currentPage: 1,
    resultsPerPage: CONFIG.RESULTS_PER_PAGE,
    userLocation: { lat: 0, lng: 0 },
    refreshInterval: null,
    currentBenefits: [],
    benefitSearchTimeout: null,
    benefitSelectedIndex: -1,
    testNotificationInterval: null
};

// Reset state to initial values
export function resetState() {
    state.currentResults = [];
    state.filteredResults = [];
    state.currentPage = 1;
    state.benefitSelectedIndex = -1;
    
    // Clear timeouts and intervals
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
    
    if (state.benefitSearchTimeout) {
        clearTimeout(state.benefitSearchTimeout);
        state.benefitSearchTimeout = null;
    }
    
    if (state.testNotificationInterval) {
        clearInterval(state.testNotificationInterval);
        state.testNotificationInterval = null;
    }
}

// Export for global access (backward compatibility)
window.nfzState = state;
window.nfzConfig = CONFIG; 