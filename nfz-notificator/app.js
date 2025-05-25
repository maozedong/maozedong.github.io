// NFZ Appointment Finder - Main Application
// API Configuration
const BASE = 'https://api.nfz.gov.pl/app-itl-api';

// Global state
let currentResults = [];
let userLocation = { lat: 0, lng: 0 };
let refreshInterval = null;
let currentBenefits = [];
let benefitSearchTimeout = null;
let benefitSelectedIndex = -1;

// DOM Elements
const elements = {
    searchForm: document.getElementById('searchForm'),
    searchBtn: document.getElementById('searchBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    loading: document.getElementById('loading'),
    resultsSection: document.getElementById('results-section'),
    resultsInfo: document.getElementById('results-info'),
    resultsTable: document.getElementById('results-table'),
    resultsCards: document.getElementById('results-cards'),
    detailsSection: document.getElementById('details-section'),
    detailsContent: document.getElementById('details-content'),
    backBtn: document.getElementById('backBtn'),
    benefitInput: document.getElementById('benefit'),
    benefitDropdown: document.getElementById('benefitDropdown'),
    benefitDropdownContent: document.querySelector('#benefitDropdown .benefit-dropdown-content'),
    benefitSearchContainer: document.querySelector('.benefit-search-container'),
    benefitError: document.getElementById('benefitError'),
    provinceSelect: document.getElementById('province'),
    localityInput: document.getElementById('locality'),
    localityList: document.getElementById('localityList'),
    refreshIntervalInput: document.getElementById('refreshInterval'),
    enableNotificationsBtn: document.getElementById('enableNotifications'),
    disableNotificationsBtn: document.getElementById('disableNotifications'),
    notificationStatus: document.getElementById('notificationStatus'),
    notificationDateThreshold: document.getElementById('notificationDateThreshold')
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('NFZ Appointment Finder initialized');
    
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
    loadSavedState();
    
    // Setup event listeners
    setupEventListeners();
    
    // Get user location
    await getUserLocation();
    
    // Setup benefit search
    setupBenefitSearch();
    
    // Check notification permission
    updateNotificationStatus();
    
    // Handle URL hash for deep linking
    handleUrlHash();
});

// Event Listeners Setup
function setupEventListeners() {
    elements.searchForm.addEventListener('submit', handleSearch);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.backBtn.addEventListener('click', showResults);
    elements.provinceSelect.addEventListener('change', handleProvinceChange);
    elements.refreshIntervalInput.addEventListener('change', handleRefreshIntervalChange);
    elements.enableNotificationsBtn.addEventListener('click', handleNotificationPermission);
    elements.disableNotificationsBtn.addEventListener('click', handleDisableNotifications);
    elements.notificationDateThreshold.addEventListener('change', handleDateThresholdChange);
    
    // Handle hash changes for deep linking
    window.addEventListener('hashchange', handleUrlHash);
}

// Load saved state from localStorage
function loadSavedState() {
    try {
        const savedQuery = localStorage.getItem('nfzQuery');
        if (savedQuery) {
            const query = JSON.parse(savedQuery);
            populateFormFromQuery(query);
        }
        
        const savedInterval = localStorage.getItem('refreshInterval');
        if (savedInterval) {
            elements.refreshIntervalInput.value = savedInterval;
        }
        
        const savedDateThreshold = localStorage.getItem('notificationDateThreshold');
        if (savedDateThreshold) {
            elements.notificationDateThreshold.value = savedDateThreshold;
        }
    } catch (error) {
        console.error('Error loading saved state:', error);
    }
}

// Populate form from saved query
function populateFormFromQuery(query) {
    // Set case radio button
    const caseRadio = document.querySelector(`input[name="case"][value="${query.case}"]`);
    if (caseRadio) caseRadio.checked = true;
    
    // Set children checkbox
    document.getElementById('children').checked = query.children || false;
    
    // Set other fields
    if (query.benefit) elements.benefitInput.value = query.benefit;
    if (query.province) elements.provinceSelect.value = query.province;
    if (query.locality) elements.localityInput.value = query.locality;
    if (query.provider) document.getElementById('provider').value = query.provider;
    if (query.place) document.getElementById('place').value = query.place;
    if (query.street) document.getElementById('street').value = query.street;
}

// Get user location
async function getUserLocation() {
    try {
        if ('geolocation' in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    enableHighAccuracy: false
                });
            });
            
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log('User location obtained:', userLocation);
        } else {
            // Try to get location by IP
            await getLocationByIP();
        }
    } catch (error) {
        console.log('Geolocation failed, trying IP location:', error);
        await getLocationByIP();
    }
}

// Get location by IP as fallback
async function getLocationByIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
            userLocation = {
                lat: data.latitude,
                lng: data.longitude
            };
            console.log('Location obtained by IP:', userLocation);
        }
    } catch (error) {
        console.log('IP location failed, using default (0,0):', error);
        userLocation = { lat: 0, lng: 0 };
    }
}

// Setup benefit search functionality
function setupBenefitSearch() {
    // Handle input changes
    elements.benefitInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        benefitSelectedIndex = -1;
        
        // Clear previous timeout
        clearTimeout(benefitSearchTimeout);
        
        if (query.length < 3) {
            hideBenefitDropdown();
            elements.benefitError.style.display = 'none';
            return;
        }
        
        // Debounce search
        benefitSearchTimeout = setTimeout(() => {
            searchBenefits(query);
        }, 300);
    });
    
    // Handle keyboard navigation
    elements.benefitInput.addEventListener('keydown', (e) => {
        if (!elements.benefitDropdown.style.display || elements.benefitDropdown.style.display === 'none') {
            return;
        }
        
        const options = elements.benefitDropdownContent.querySelectorAll('.benefit-option');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                benefitSelectedIndex = Math.min(benefitSelectedIndex + 1, options.length - 1);
                updateSelection(options);
                break;
            case 'ArrowUp':
                e.preventDefault();
                benefitSelectedIndex = Math.max(benefitSelectedIndex - 1, -1);
                updateSelection(options);
                break;
            case 'Enter':
                e.preventDefault();
                if (benefitSelectedIndex >= 0 && options[benefitSelectedIndex]) {
                    selectBenefit(currentBenefits[benefitSelectedIndex]);
                }
                break;
            case 'Escape':
                hideBenefitDropdown();
                break;
        }
    });
    
    // Handle clicks outside dropdown
    document.addEventListener('click', (e) => {
        if (!elements.benefitSearchContainer.contains(e.target)) {
            hideBenefitDropdown();
        }
    });
    
    // Handle focus
    elements.benefitInput.addEventListener('focus', () => {
        const query = elements.benefitInput.value.trim();
        if (query.length >= 3) {
            searchBenefits(query);
        }
    });
}

// Search benefits from API
async function searchBenefits(query) {
    try {
        showBenefitDropdown();
        elements.benefitDropdownContent.innerHTML = '<div class="benefit-dropdown-loading">Пошук...</div>';
        
        const response = await fetch(`${BASE}/benefits?format=json&name=${encodeURIComponent(query)}&limit=20`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentBenefits = data.data || [];
        
        if (currentBenefits.length === 0) {
            elements.benefitDropdownContent.innerHTML = '<div class="benefit-dropdown-empty">Нічого не знайдено для запиту "' + query + '"</div>';
        } else {
            populateBenefitDropdown(currentBenefits);
        }
        
        elements.benefitError.style.display = 'none';
    } catch (error) {
        console.error('Failed to search benefits:', error);
        elements.benefitDropdownContent.innerHTML = '<div class="benefit-dropdown-error">Помилка пошуку: ' + error.message + '</div>';
        elements.benefitError.textContent = `Помилка пошуку спеціальностей: ${error.message}`;
        elements.benefitError.style.display = 'block';
    }
}

// Populate benefit dropdown with results
function populateBenefitDropdown(benefits) {
    elements.benefitDropdownContent.innerHTML = '';
    
    benefits.forEach((benefit, index) => {
        const option = document.createElement('div');
        option.className = 'benefit-option';
        option.textContent = benefit;
        option.addEventListener('click', () => selectBenefit(benefit));
        elements.benefitDropdownContent.appendChild(option);
    });
}

// Select a benefit from dropdown
function selectBenefit(benefit) {
    elements.benefitInput.value = benefit;
    hideBenefitDropdown();
    elements.benefitInput.focus();
}

// Show benefit dropdown
function showBenefitDropdown() {
    elements.benefitDropdown.style.display = 'block';
    elements.benefitSearchContainer.classList.add('dropdown-open');
}

// Hide benefit dropdown
function hideBenefitDropdown() {
    elements.benefitDropdown.style.display = 'none';
    elements.benefitSearchContainer.classList.remove('dropdown-open');
    benefitSelectedIndex = -1;
}

// Update keyboard selection
function updateSelection(options) {
    options.forEach((option, index) => {
        option.classList.toggle('selected', index === benefitSelectedIndex);
    });
    
    // Scroll selected option into view
    if (benefitSelectedIndex >= 0 && options[benefitSelectedIndex]) {
        options[benefitSelectedIndex].scrollIntoView({ block: 'nearest' });
    }
}

// Handle province change to load localities
async function handleProvinceChange() {
    const province = elements.provinceSelect.value;
    if (!province) {
        elements.localityList.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${BASE}/localities?province=${province}&format=json`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        populateLocalitiesList(data.data);
    } catch (error) {
        console.error('Failed to load localities:', error);
        elements.localityList.innerHTML = '';
    }
}

// Populate localities datalist
function populateLocalitiesList(localities) {
    elements.localityList.innerHTML = '';
    localities.forEach(locality => {
        const option = document.createElement('option');
        option.value = locality.attributes.name;
        elements.localityList.appendChild(option);
    });
}

// Build query object from form
function buildQueryObject() {
    const formData = new FormData(elements.searchForm);
    const query = {
        case: parseInt(formData.get('case')),
        children: document.getElementById('children').checked,
        benefit: elements.benefitInput.value.trim(),
        province: elements.provinceSelect.value
    };
    
    // Add optional fields
    const locality = elements.localityInput.value.trim();
    if (locality) query.locality = locality;
    
    const provider = document.getElementById('provider').value.trim();
    if (provider) query.provider = provider;
    
    const place = document.getElementById('place').value.trim();
    if (place) query.place = place;
    
    const street = document.getElementById('street').value.trim();
    if (street) query.street = street;
    
    return query;
}

// Build API URL from query object
function buildApiUrl(query) {
    const params = new URLSearchParams();
    
    params.append('case', query.case.toString());
    params.append('format', 'json');
    params.append('limit', '25');
    
    if (query.children) {
        params.append('benefitsForChildren', 'Y');
    }
    
    if (query.benefit) {
        // Use benefit name directly as returned from the benefits API
        params.append('benefit', query.benefit);
    }
    
    if (query.province) {
        params.append('province', query.province);
    }
    
    if (query.locality) {
        params.append('locality', query.locality);
    }
    
    if (query.provider) {
        params.append('provider', query.provider);
    }
    
    if (query.place) {
        params.append('place', query.place);
    }
    
    if (query.street) {
        params.append('street', query.street);
    }
    
    return `${BASE}/queues?${params.toString()}`;
}

// Calculate distance using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Fetch and rank appointments
async function fetchAndRank(query) {
    const url = buildApiUrl(query);
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process results
    const results = data.data.map(item => {
        const attr = item.attributes;
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            attr.latitude || 0, attr.longitude || 0
        );
        
        return {
            id: item.id,
            date: attr.dates?.date || '',
            benefit: attr.benefit || '',
            provider: attr.provider || '',
            address: attr.address || '',
            locality: attr.locality || '',
            distance: distance,
            phone: attr.phone || null,
            latitude: attr.latitude || 0,
            longitude: attr.longitude || 0,
            attributes: attr
        };
    });
    
    // Sort by date first, then by distance
    results.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        return a.distance - b.distance;
    });
    
    return results;
}

// Handle search form submission
async function handleSearch(event) {
    event.preventDefault();
    
    if (!elements.provinceSelect.value) {
        alert('Будь ласка, оберіть воєводство');
        return;
    }
    
    const query = buildQueryObject();
    
    // Save query to localStorage
    localStorage.setItem('nfzQuery', JSON.stringify(query));
    
    await performSearch(query);
}

// Perform search
async function performSearch(query) {
    showLoading();
    
    try {
        const results = await fetchAndRank(query);
        currentResults = results;
        displayResults(results);
        elements.refreshBtn.disabled = false;
        
        // Check for better results and notify if needed
        checkForBetterResults(results);
        
    } catch (error) {
        console.error('Search failed:', error);
        hideLoading();
        alert(`Помилка пошуку: ${error.message}`);
    }
}

// Handle refresh
async function handleRefresh() {
    const savedQuery = localStorage.getItem('nfzQuery');
    if (savedQuery) {
        const query = JSON.parse(savedQuery);
        await performSearch(query);
    }
}

// Show loading state
function showLoading() {
    elements.loading.style.display = 'block';
    elements.resultsSection.style.display = 'none';
    elements.detailsSection.style.display = 'none';
    elements.searchBtn.disabled = true;
}

// Hide loading state
function hideLoading() {
    elements.loading.style.display = 'none';
    elements.searchBtn.disabled = false;
}

// Display search results
function displayResults(results) {
    hideLoading();
    
    if (results.length === 0) {
        elements.resultsInfo.textContent = 'Не знайдено доступних термінів за вашими критеріями.';
        elements.resultsTable.querySelector('tbody').innerHTML = '';
        elements.resultsCards.innerHTML = '';
        elements.resultsSection.style.display = 'block';
        return;
    }
    
    elements.resultsInfo.textContent = `Знайдено ${results.length} термінів. Показано перші 10 найближчих за датою та відстанню.`;
    
    // Show top 10 results
    const topResults = results.slice(0, 10);
    
    // Set date threshold to closest date if not set
    if (!elements.notificationDateThreshold.value && topResults.length > 0) {
        elements.notificationDateThreshold.value = topResults[0].date;
        localStorage.setItem('notificationDateThreshold', topResults[0].date);
    }
    
    // Populate desktop table
    populateDesktopTable(topResults);
    
    // Populate mobile cards
    populateMobileCards(topResults);
    
    elements.resultsSection.style.display = 'block';
    elements.detailsSection.style.display = 'none';
}

// Populate desktop table view
function populateDesktopTable(results) {
    const tbody = elements.resultsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.dataset.id = result.id;
        row.addEventListener('click', () => showDetails(result.id));
        
        const formattedDate = formatDate(result.date);
        const fullAddress = `${result.address}, ${result.locality}`.replace(/^, |, $/, '');
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${result.benefit}</td>
            <td>${result.provider}</td>
            <td>${fullAddress}</td>
            <td>${result.distance.toFixed(1)}</td>
            <td>${result.phone || '–'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Populate mobile card view
function populateMobileCards(results) {
    elements.resultsCards.innerHTML = '';
    
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.id = result.id;
        card.addEventListener('click', () => showDetails(result.id));
        
        const formattedDate = formatDate(result.date);
        const fullAddress = `${result.address}, ${result.locality}`.replace(/^, |, $/, '');
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
        
        card.innerHTML = `
            <div class="result-card-header">
                <span class="result-card-date">${formattedDate}</span>
                <span class="result-card-distance">${result.distance.toFixed(1)} км</span>
            </div>
            <div class="result-card-title">${result.benefit}</div>
            <div class="result-card-provider">${result.provider}</div>
            <div class="result-card-address">📍 ${fullAddress}</div>
            <div class="result-card-actions">
                ${result.phone ? `<a href="tel:${result.phone}" class="result-card-phone" onclick="event.stopPropagation()">📞 ${result.phone}</a>` : '<span style="color: #6c757d;">Телефон недоступний</span>'}
                <a href="${googleMapsUrl}" target="_blank" class="result-card-nav-btn" onclick="event.stopPropagation()">🗺️ Навігація</a>
            </div>
        `;
        
        elements.resultsCards.appendChild(card);
    });
}

// Format date in Polish format
function formatDate(dateString) {
    if (!dateString) return '–';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
}

// Show appointment details
function showDetails(id) {
    const result = currentResults.find(r => r.id === id);
    if (!result) return;
    
    location.hash = `slot=${id}`;
    
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
    
    const content = `
        <h3>${result.benefit}</h3>
        <div class="detail-item">
            <span class="detail-label">Дата:</span>
            <span class="detail-value">${formatDate(result.date)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Заклад:</span>
            <span class="detail-value">${result.provider}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Адреса:</span>
            <span class="detail-value">${result.address}, ${result.locality}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Відстань:</span>
            <span class="detail-value">${result.distance.toFixed(1)} км</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Телефон:</span>
            <span class="detail-value">
                ${result.phone ? `<a href="tel:${result.phone}">${result.phone}</a>` : '–'}
            </span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Навігація:</span>
            <span class="detail-value">
                <a href="${googleMapsUrl}" target="_blank" class="result-card-nav-btn">🗺️ Відкрити в Google Maps</a>
            </span>
        </div>
    `;
    
    elements.detailsContent.innerHTML = content;
    elements.resultsSection.style.display = 'none';
    elements.detailsSection.style.display = 'block';
}

// Show results (back from details)
function showResults() {
    location.hash = '';
    elements.detailsSection.style.display = 'none';
    elements.resultsSection.style.display = 'block';
}

// Handle URL hash for deep linking
function handleUrlHash() {
    const hash = location.hash;
    if (hash.startsWith('#slot=')) {
        const id = hash.substring(6);
        if (currentResults.length > 0) {
            showDetails(id);
        }
    }
}

// Handle refresh interval change
function handleRefreshIntervalChange() {
    const interval = parseInt(elements.refreshIntervalInput.value);
    localStorage.setItem('refreshInterval', interval.toString());
    setupPeriodicRefresh();
}

// Setup periodic refresh
function setupPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    const interval = parseInt(localStorage.getItem('refreshInterval') || '60');
    const savedQuery = localStorage.getItem('nfzQuery');
    
    if (savedQuery && interval > 0) {
        refreshInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                console.log('Performing periodic refresh');
                await handleRefresh();
            }
        }, interval * 60 * 1000);
    }
}

// Check for better results and send notifications
function checkForBetterResults(results) {
    if (results.length === 0) return;
    
    const bestResult = results[0];
    const savedBestDate = localStorage.getItem('bestResultDate');
    const savedBestId = localStorage.getItem('bestResultId');
    const dateThreshold = elements.notificationDateThreshold.value;
    
    // Check if result meets date threshold
    if (dateThreshold && new Date(bestResult.date) > new Date(dateThreshold)) {
        return; // Don't notify if date is after threshold
    }
    
    // Check if we have a better (earlier) date or it's a new search
    if (!savedBestDate || new Date(bestResult.date) < new Date(savedBestDate) || savedBestId !== bestResult.id) {
        localStorage.setItem('bestResultDate', bestResult.date);
        localStorage.setItem('bestResultId', bestResult.id);
        
        // Send notification if permission granted and it's not the first search
        if (savedBestDate && 'Notification' in window && Notification.permission === 'granted') {
            sendNotification(bestResult);
        }
    }
}

// Send notification
function sendNotification(result) {
    const title = `${result.benefit} – ${formatDate(result.date)}`;
    const body = `${result.locality}, ${result.address} (${result.distance.toFixed(1)} км)  Натисніть, щоб переглянути`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            id: result.id,
            phone: result.phone,
            url: `/index.html#slot=${result.id}`
        },
        actions: result.phone ? [{action: 'call', title: '📞 Дзвінок'}] : []
    });
    
    notification.onclick = () => {
        window.focus();
        showDetails(result.id);
        notification.close();
    };
}

// Handle notification permission
async function handleNotificationPermission() {
    if (!('Notification' in window)) {
        alert('Ваш браузер не підтримує сповіщення');
        return;
    }
    
    if (Notification.permission === 'granted') {
        alert('Сповіщення вже увімкнені');
        return;
    }
    
    const permission = await Notification.requestPermission();
    updateNotificationStatus();
    
    if (permission === 'granted') {
        setupPeriodicRefresh();
    }
}

// Handle disable notifications
function handleDisableNotifications() {
    // Clear periodic refresh
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    // Clear saved notification data
    localStorage.removeItem('bestResultDate');
    localStorage.removeItem('bestResultId');
    
    // Update UI
    elements.enableNotificationsBtn.style.display = 'inline-flex';
    elements.disableNotificationsBtn.style.display = 'none';
    elements.enableNotificationsBtn.disabled = false;
    elements.notificationStatus.textContent = 'Вимкнені';
    
    alert('Сповіщення вимкнені');
}

// Handle date threshold change
function handleDateThresholdChange() {
    const threshold = elements.notificationDateThreshold.value;
    localStorage.setItem('notificationDateThreshold', threshold);
}

// Update notification status display
function updateNotificationStatus() {
    if (!('Notification' in window)) {
        elements.notificationStatus.textContent = 'Не підтримується';
        elements.enableNotificationsBtn.disabled = true;
        elements.disableNotificationsBtn.style.display = 'none';
        return;
    }
    
    switch (Notification.permission) {
        case 'granted':
            elements.notificationStatus.textContent = 'Увімкнені ✅';
            elements.enableNotificationsBtn.style.display = 'none';
            elements.disableNotificationsBtn.style.display = 'inline-flex';
            setupPeriodicRefresh();
            break;
        case 'denied':
            elements.notificationStatus.textContent = 'Заблоковані ❌';
            elements.enableNotificationsBtn.disabled = true;
            elements.disableNotificationsBtn.style.display = 'none';
            break;
        default:
            elements.notificationStatus.textContent = 'Вимкнені';
            elements.enableNotificationsBtn.disabled = false;
            elements.enableNotificationsBtn.style.display = 'inline-flex';
            elements.disableNotificationsBtn.style.display = 'none';
            break;
    }
} 