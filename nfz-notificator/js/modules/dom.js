// NFZ Appointment Finder - DOM Elements Management

// DOM Elements cache
export const elements = {
    searchForm: null,
    searchBtn: null,
    refreshBtn: null,
    loading: null,
    resultsSection: null,
    resultsInfo: null,
    resultsTable: null,
    resultsCards: null,
    detailsSection: null,
    detailsContent: null,
    backBtn: null,
    benefitInput: null,
    benefitDropdown: null,
    benefitDropdownContent: null,
    benefitSearchContainer: null,
    benefitError: null,
    provinceSelect: null,
    localityInput: null,
    localityList: null,
    refreshIntervalInput: null,
    enableNotificationsBtn: null,
    disableNotificationsBtn: null,
    notificationStatus: null,
    notificationDateThreshold: null,
    testNotificationsBtn: null,
    testNotificationStatus: null,
    paginationControls: null,
    prevPageBtn: null,
    nextPageBtn: null,
    pageInfo: null
};

// Initialize DOM elements
export function initializeElements() {
    elements.searchForm = document.getElementById('searchForm');
    elements.searchBtn = document.getElementById('searchBtn');
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.loading = document.getElementById('loading');
    elements.resultsSection = document.getElementById('results-section');
    elements.resultsInfo = document.getElementById('results-info');
    elements.resultsTable = document.getElementById('results-table');
    elements.resultsCards = document.getElementById('results-cards');
    elements.detailsSection = document.getElementById('details-section');
    elements.detailsContent = document.getElementById('details-content');
    elements.backBtn = document.getElementById('backBtn');
    elements.benefitInput = document.getElementById('benefit');
    elements.benefitDropdown = document.getElementById('benefitDropdown');
    elements.benefitDropdownContent = document.querySelector('#benefitDropdown .benefit-dropdown-content');
    elements.benefitSearchContainer = document.querySelector('.benefit-search-container');
    elements.benefitError = document.getElementById('benefitError');
    elements.provinceSelect = document.getElementById('province');
    elements.localityInput = document.getElementById('locality');
    elements.localityList = document.getElementById('localityList');
    elements.refreshIntervalInput = document.getElementById('refreshInterval');
    elements.enableNotificationsBtn = document.getElementById('enableNotifications');
    elements.disableNotificationsBtn = document.getElementById('disableNotifications');
    elements.notificationStatus = document.getElementById('notificationStatus');
    elements.notificationDateThreshold = document.getElementById('notificationDateThreshold');
    elements.testNotificationsBtn = document.getElementById('testNotificationsBtn');
    elements.testNotificationStatus = document.getElementById('testNotificationStatus');
    elements.paginationControls = document.getElementById('pagination-controls');
    elements.prevPageBtn = document.getElementById('prevPageBtn');
    elements.nextPageBtn = document.getElementById('nextPageBtn');
    elements.pageInfo = document.getElementById('pageInfo');
    
    console.log('DOM elements initialized');
}

// Validate that required elements exist
export function validateElements() {
    const required = [
        'searchForm', 'searchBtn', 'refreshBtn', 'loading', 'resultsSection',
        'benefitInput', 'provinceSelect', 'notificationStatus'
    ];
    
    const missing = required.filter(key => !elements[key]);
    
    if (missing.length > 0) {
        console.error('Missing required DOM elements:', missing);
        return false;
    }
    
    return true;
}

// Create pagination controls dynamically if they don't exist
export function ensurePaginationControls() {
    if (elements.paginationControls) return true;
    
    const resultsSection = elements.resultsSection;
    if (!resultsSection) return false;
    
    const paginationControls = document.createElement('div');
    paginationControls.id = 'pagination-controls';
    paginationControls.className = 'pagination-controls';
    paginationControls.style.display = 'none';
    
    paginationControls.innerHTML = `
        <button type="button" id="prevPageBtn" disabled>← Попередня</button>
        <span id="pageInfo">Сторінка 1 з 1</span>
        <button type="button" id="nextPageBtn" disabled>Наступна →</button>
    `;
    
    resultsSection.appendChild(paginationControls);
    
    // Update element references
    elements.paginationControls = paginationControls;
    elements.prevPageBtn = document.getElementById('prevPageBtn');
    elements.nextPageBtn = document.getElementById('nextPageBtn');
    elements.pageInfo = document.getElementById('pageInfo');
    
    console.log('Created pagination controls dynamically');
    return true;
}

// Export for global access (backward compatibility)
window.nfzElements = elements; 