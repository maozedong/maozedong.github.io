// NFZ Appointment Finder - Main Application Module

import { CONFIG, state } from './modules/config.js';
import { elements, initializeElements, validateElements, ensurePaginationControls } from './modules/dom.js';
import { loadSavedState, saveQuery, saveRefreshInterval, saveDateThreshold } from './services/storage.js';
import { getUserLocation } from './services/geolocation.js';
import { buildQueryObject, validateQuery, fetchAndRankAppointments, loadLocalities } from './services/api.js';
import { setupBenefitSearch } from './ui/benefits.js';
import { 
    displayResults, 
    showLoading, 
    hideLoading, 
    showDetails, 
    showResults, 
    handlePrevPage, 
    handleNextPage 
} from './ui/results.js';
import { 
    updateNotificationStatus, 
    handleNotificationPermission, 
    handleDisableNotifications, 
    setupPeriodicRefresh, 
    checkForBetterResults, 
    handleTestNotifications 
} from './services/notifications.js';

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('NFZ Appointment Finder initialized');
    
    // Initialize DOM elements
    initializeElements();
    
    if (!validateElements()) {
        console.error('Required DOM elements are missing');
        return;
    }
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    // Load saved state
    loadSavedState(elements);
    
    // Setup event listeners
    setupEventListeners();
    
    // Get user location
    state.userLocation = await getUserLocation();
    
    // Setup benefit search
    setupBenefitSearch(elements);
    
    // Check notification permission
    updateNotificationStatus(elements);
    
    // Handle URL hash for deep linking
    handleUrlHash();
});

// Event Listeners Setup
function setupEventListeners() {
    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', handleSearch);
    }
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', handleRefresh);
    }
    if (elements.backBtn) {
        elements.backBtn.addEventListener('click', () => showResults(elements));
    }
    if (elements.provinceSelect) {
        elements.provinceSelect.addEventListener('change', handleProvinceChange);
    }
    if (elements.refreshIntervalInput) {
        elements.refreshIntervalInput.addEventListener('change', handleRefreshIntervalChange);
    }
    if (elements.enableNotificationsBtn) {
        elements.enableNotificationsBtn.addEventListener('click', () => handleNotificationPermission(elements));
    }
    if (elements.disableNotificationsBtn) {
        elements.disableNotificationsBtn.addEventListener('click', () => handleDisableNotifications(elements));
    }
    if (elements.notificationDateThreshold) {
        elements.notificationDateThreshold.addEventListener('change', handleDateThresholdChange);
    }
    if (elements.testNotificationsBtn) {
        elements.testNotificationsBtn.addEventListener('click', () => handleTestNotifications(elements));
    }
    
    // Add pagination event listeners with safety checks
    ensurePaginationControls();
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => handlePrevPage(elements));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => handleNextPage(elements));
    }
    
    // Handle hash changes for deep linking
    window.addEventListener('hashchange', handleUrlHash);
}

// Handle province change to load localities
async function handleProvinceChange() {
    const province = elements.provinceSelect?.value;
    if (!province || !elements.localityList) {
        if (elements.localityList) {
            elements.localityList.innerHTML = '';
        }
        return;
    }
    
    try {
        const localities = await loadLocalities(province);
        populateLocalitiesList(localities);
    } catch (error) {
        console.error('Failed to load localities:', error);
        elements.localityList.innerHTML = '';
    }
}

// Populate localities datalist
function populateLocalitiesList(localities) {
    if (!elements.localityList) return;
    
    elements.localityList.innerHTML = '';
    localities.forEach(locality => {
        const option = document.createElement('option');
        option.value = locality.attributes.name;
        elements.localityList.appendChild(option);
    });
}

// Handle search form submission
async function handleSearch(event) {
    event.preventDefault();
    
    if (!elements.provinceSelect?.value) {
        alert('Будь ласка, оберіть воєводство');
        return;
    }
    
    const query = buildQueryObject(elements.searchForm);
    
    // Validate query
    const validation = validateQuery(query);
    if (!validation.isValid) {
        alert('Помилки у формі:\n' + validation.errors.join('\n'));
        return;
    }
    
    // Save query to localStorage
    saveQuery(query);
    
    await performSearch(query);
}

// Perform search
async function performSearch(query) {
    showLoading(elements);
    
    try {
        const results = await fetchAndRankAppointments(query, state.userLocation);
        state.currentResults = results;
        displayResults(results, elements);
        
        if (elements.refreshBtn) {
            elements.refreshBtn.disabled = false;
        }
        
        // Check for better results and notify if needed
        checkForBetterResults(results, elements);
        
    } catch (error) {
        console.error('Search failed:', error);
        hideLoading(elements);
        alert(`Помилка пошуку: ${error.message}`);
    }
}

// Handle refresh
export async function handleRefresh() {
    const savedQuery = localStorage.getItem('nfzQuery');
    if (savedQuery) {
        const query = JSON.parse(savedQuery);
        await performSearch(query);
    }
}

// Handle refresh interval change
function handleRefreshIntervalChange() {
    const interval = parseInt(elements.refreshIntervalInput?.value || '60');
    saveRefreshInterval(interval);
    setupPeriodicRefresh();
}

// Handle date threshold change
function handleDateThresholdChange() {
    const threshold = elements.notificationDateThreshold?.value;
    if (threshold) {
        saveDateThreshold(threshold);
    }
}

// Handle URL hash for deep linking
function handleUrlHash() {
    const hash = location.hash;
    if (hash.startsWith('#slot=')) {
        const id = hash.substring(6);
        if (state.currentResults.length > 0) {
            showDetails(id, elements);
        }
    }
}

// Export functions that might be needed by other modules
export { 
    handleSearch, 
    performSearch, 
    handleProvinceChange,
    handleRefreshIntervalChange,
    handleDateThresholdChange,
    handleUrlHash
}; 