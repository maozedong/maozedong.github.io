// NFZ Appointment Finder - Local Storage Service

// Storage keys
const STORAGE_KEYS = {
    QUERY: 'nfzQuery',
    BEST_RESULT_DATE: 'bestResultDate',
    BEST_RESULT_ID: 'bestResultId',
    REFRESH_INTERVAL: 'refreshInterval',
    NOTIFICATION_DATE_THRESHOLD: 'notificationDateThreshold'
};

// Save query to localStorage
export function saveQuery(query) {
    try {
        localStorage.setItem(STORAGE_KEYS.QUERY, JSON.stringify(query));
        console.log('Query saved to localStorage');
    } catch (error) {
        console.error('Failed to save query:', error);
    }
}

// Load query from localStorage
export function loadQuery() {
    try {
        const savedQuery = localStorage.getItem(STORAGE_KEYS.QUERY);
        return savedQuery ? JSON.parse(savedQuery) : null;
    } catch (error) {
        console.error('Failed to load query:', error);
        return null;
    }
}

// Save refresh interval
export function saveRefreshInterval(interval) {
    try {
        localStorage.setItem(STORAGE_KEYS.REFRESH_INTERVAL, interval.toString());
    } catch (error) {
        console.error('Failed to save refresh interval:', error);
    }
}

// Load refresh interval
export function loadRefreshInterval() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.REFRESH_INTERVAL);
        return saved ? parseInt(saved) : 60; // default 60 minutes
    } catch (error) {
        console.error('Failed to load refresh interval:', error);
        return 60;
    }
}

// Save notification date threshold
export function saveDateThreshold(date) {
    try {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATION_DATE_THRESHOLD, date);
    } catch (error) {
        console.error('Failed to save date threshold:', error);
    }
}

// Load notification date threshold
export function loadDateThreshold() {
    try {
        return localStorage.getItem(STORAGE_KEYS.NOTIFICATION_DATE_THRESHOLD);
    } catch (error) {
        console.error('Failed to load date threshold:', error);
        return null;
    }
}

// Save best result for notifications
export function saveBestResult(date, id) {
    try {
        localStorage.setItem(STORAGE_KEYS.BEST_RESULT_DATE, date);
        localStorage.setItem(STORAGE_KEYS.BEST_RESULT_ID, id);
    } catch (error) {
        console.error('Failed to save best result:', error);
    }
}

// Load best result
export function loadBestResult() {
    try {
        return {
            date: localStorage.getItem(STORAGE_KEYS.BEST_RESULT_DATE),
            id: localStorage.getItem(STORAGE_KEYS.BEST_RESULT_ID)
        };
    } catch (error) {
        console.error('Failed to load best result:', error);
        return { date: null, id: null };
    }
}

// Clear notification data
export function clearNotificationData() {
    try {
        localStorage.removeItem(STORAGE_KEYS.BEST_RESULT_DATE);
        localStorage.removeItem(STORAGE_KEYS.BEST_RESULT_ID);
        console.log('Notification data cleared');
    } catch (error) {
        console.error('Failed to clear notification data:', error);
    }
}

// Populate form from saved query
export function populateFormFromQuery(query, elements) {
    if (!query || !elements) return;
    
    try {
        // Set case radio button
        const caseRadio = document.querySelector(`input[name="case"][value="${query.case}"]`);
        if (caseRadio) caseRadio.checked = true;
        
        // Set children checkbox
        const childrenCheckbox = document.getElementById('children');
        if (childrenCheckbox) childrenCheckbox.checked = query.children || false;
        
        // Set other fields
        if (query.benefit && elements.benefitInput) {
            elements.benefitInput.value = query.benefit;
        }
        if (query.province && elements.provinceSelect) {
            elements.provinceSelect.value = query.province;
        }
        if (query.locality && elements.localityInput) {
            elements.localityInput.value = query.locality;
        }
        
        const providerInput = document.getElementById('provider');
        if (query.provider && providerInput) {
            providerInput.value = query.provider;
        }
        
        const placeInput = document.getElementById('place');
        if (query.place && placeInput) {
            placeInput.value = query.place;
        }
        
        const streetInput = document.getElementById('street');
        if (query.street && streetInput) {
            streetInput.value = query.street;
        }
        
        console.log('Form populated from saved query');
    } catch (error) {
        console.error('Failed to populate form from query:', error);
    }
}

// Load all saved state
export function loadSavedState(elements) {
    try {
        // Load and populate query
        const savedQuery = loadQuery();
        if (savedQuery) {
            populateFormFromQuery(savedQuery, elements);
        }
        
        // Load refresh interval
        const savedInterval = loadRefreshInterval();
        if (elements.refreshIntervalInput) {
            elements.refreshIntervalInput.value = savedInterval;
        }
        
        // Load date threshold
        const savedDateThreshold = loadDateThreshold();
        if (savedDateThreshold && elements.notificationDateThreshold) {
            elements.notificationDateThreshold.value = savedDateThreshold;
        }
        
        console.log('Saved state loaded successfully');
    } catch (error) {
        console.error('Error loading saved state:', error);
    }
}

// Export storage keys for external use
export { STORAGE_KEYS }; 