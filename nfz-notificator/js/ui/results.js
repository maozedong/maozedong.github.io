// NFZ Appointment Finder - Results Display UI

import { state } from '../modules/config.js';
import { ensurePaginationControls } from '../modules/dom.js';

// Format date in Polish format
export function formatDate(dateString) {
    if (!dateString) return '–';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
}

// Display search results
export function displayResults(results, elements) {
    hideLoading(elements);
    
    state.filteredResults = results;
    state.currentPage = 1;
    
    if (results.length === 0) {
        if (elements.resultsInfo) {
            elements.resultsInfo.textContent = 'Не знайдено доступних майбутніх термінів за вашими критеріями.';
        }
        clearResultsDisplay(elements);
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'block';
        }
        return;
    }
    
    // Set date threshold to closest date if not set
    if (elements.notificationDateThreshold && 
        !elements.notificationDateThreshold.value && 
        results.length > 0) {
        elements.notificationDateThreshold.value = results[0].date;
        localStorage.setItem('notificationDateThreshold', results[0].date);
    }
    
    // Display current page
    displayCurrentPage(elements);
    
    if (elements.resultsSection) {
        elements.resultsSection.style.display = 'block';
    }
    if (elements.detailsSection) {
        elements.detailsSection.style.display = 'none';
    }
}

// Display current page of results
export function displayCurrentPage(elements) {
    const totalPages = Math.ceil(state.filteredResults.length / state.resultsPerPage);
    const startIndex = (state.currentPage - 1) * state.resultsPerPage;
    const endIndex = startIndex + state.resultsPerPage;
    const pageResults = state.filteredResults.slice(startIndex, endIndex);
    
    // Update info text
    if (elements.resultsInfo) {
        elements.resultsInfo.textContent = 
            `Знайдено ${state.filteredResults.length} майбутніх термінів. ` +
            `Сторінка ${state.currentPage} з ${totalPages} ` +
            `(показано ${pageResults.length} термінів).`;
    }
    
    // Populate desktop table
    populateDesktopTable(pageResults, elements);
    
    // Populate mobile cards
    populateMobileCards(pageResults, elements);
    
    // Update pagination controls
    updatePaginationControls(totalPages, elements);
}

// Update pagination controls
function updatePaginationControls(totalPages, elements) {
    // Ensure pagination controls exist
    ensurePaginationControls();
    
    // Re-query elements to ensure they exist
    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!paginationControls || !prevPageBtn || !nextPageBtn || !pageInfo) {
        console.warn('Pagination elements still not found after creation attempt');
        return;
    }
    
    console.log(`Pagination: totalPages=${totalPages}, currentPage=${state.currentPage}`);
    
    // Update button states
    prevPageBtn.disabled = state.currentPage <= 1;
    nextPageBtn.disabled = state.currentPage >= totalPages;
    pageInfo.textContent = `Сторінка ${state.currentPage} з ${totalPages}`;
    
    // Show/hide pagination
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
    } else {
        paginationControls.style.display = 'flex';
    }
}

// Handle previous page
export function handlePrevPage(elements) {
    if (state.currentPage > 1) {
        state.currentPage--;
        displayCurrentPage(elements);
    }
}

// Handle next page
export function handleNextPage(elements) {
    const totalPages = Math.ceil(state.filteredResults.length / state.resultsPerPage);
    if (state.currentPage < totalPages) {
        state.currentPage++;
        displayCurrentPage(elements);
    }
}

// Populate desktop table view
function populateDesktopTable(results, elements) {
    if (!elements.resultsTable) return;
    
    const tbody = elements.resultsTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.dataset.id = result.id;
        row.addEventListener('click', () => showDetails(result.id, elements));
        
        const formattedDate = formatDate(result.date);
        const formattedUpdatedDate = formatDate(result.updatedDate);
        const fullAddress = `${result.address}, ${result.locality}`.replace(/^, |, $/, '');
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${formattedUpdatedDate}</td>
            <td>${result.provider}</td>
            <td>${fullAddress}</td>
            <td>${result.distance.toFixed(1)}</td>
            <td>${result.phone || '–'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Populate mobile card view
function populateMobileCards(results, elements) {
    if (!elements.resultsCards) return;
    
    elements.resultsCards.innerHTML = '';
    
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.id = result.id;
        card.addEventListener('click', () => showDetails(result.id, elements));
        
        const formattedDate = formatDate(result.date);
        const formattedUpdatedDate = formatDate(result.updatedDate);
        const fullAddress = `${result.address}, ${result.locality}`.replace(/^, |, $/, '');
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
        
        card.innerHTML = `
            <div class="result-card-header">
                <span class="result-card-date">${formattedDate}</span>
                <span class="result-card-distance">${result.distance.toFixed(1)} км</span>
            </div>
            <div class="result-card-title">${result.benefit}</div>
            <div class="result-card-provider">${result.provider}</div>
            <div class="result-card-updated">Оновлено: ${formattedUpdatedDate}</div>
            <div class="result-card-address">📍 ${fullAddress}</div>
            <div class="result-card-actions">
                ${result.phone ? 
                    `<a href="tel:${result.phone}" class="result-card-phone" onclick="event.stopPropagation()">📞 ${result.phone}</a>` : 
                    '<span style="color: #6c757d;">Телефон недоступний</span>'
                }
                <a href="${googleMapsUrl}" target="_blank" class="result-card-nav-btn" onclick="event.stopPropagation()">🗺️ Навігація</a>
            </div>
        `;
        
        elements.resultsCards.appendChild(card);
    });
}

// Show appointment details
export function showDetails(id, elements) {
    const result = state.currentResults.find(r => r.id === id);
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
            <span class="detail-label">Оновлено:</span>
            <span class="detail-value">${formatDate(result.updatedDate)}</span>
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
    
    if (elements.detailsContent) {
        elements.detailsContent.innerHTML = content;
    }
    if (elements.resultsSection) {
        elements.resultsSection.style.display = 'none';
    }
    if (elements.detailsSection) {
        elements.detailsSection.style.display = 'block';
    }
}

// Show results (back from details)
export function showResults(elements) {
    location.hash = '';
    if (elements.detailsSection) {
        elements.detailsSection.style.display = 'none';
    }
    if (elements.resultsSection) {
        elements.resultsSection.style.display = 'block';
    }
}

// Show loading state
export function showLoading(elements) {
    if (elements.loading) {
        elements.loading.style.display = 'block';
    }
    if (elements.resultsSection) {
        elements.resultsSection.style.display = 'none';
    }
    if (elements.detailsSection) {
        elements.detailsSection.style.display = 'none';
    }
    if (elements.searchBtn) {
        elements.searchBtn.disabled = true;
    }
}

// Hide loading state
export function hideLoading(elements) {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
    if (elements.searchBtn) {
        elements.searchBtn.disabled = false;
    }
}

// Clear results display
function clearResultsDisplay(elements) {
    if (elements.resultsTable) {
        const tbody = elements.resultsTable.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    }
    if (elements.resultsCards) {
        elements.resultsCards.innerHTML = '';
    }
    
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.style.display = 'none';
    }
} 