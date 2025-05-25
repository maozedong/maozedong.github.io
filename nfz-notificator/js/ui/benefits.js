// NFZ Appointment Finder - Benefits Search UI

import { CONFIG, state } from '../modules/config.js';
import { searchBenefits } from '../services/api.js';

// Setup benefit search functionality
export function setupBenefitSearch(elements) {
    if (!elements.benefitInput) {
        console.warn('Benefit input element not found');
        return;
    }
    
    // Handle input changes
    elements.benefitInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        state.benefitSelectedIndex = -1;
        
        // Clear previous timeout
        clearTimeout(state.benefitSearchTimeout);
        
        if (query.length < CONFIG.MIN_BENEFIT_SEARCH_LENGTH) {
            hideBenefitDropdown(elements);
            if (elements.benefitError) {
                elements.benefitError.style.display = 'none';
            }
            return;
        }
        
        // Debounce search
        state.benefitSearchTimeout = setTimeout(() => {
            performBenefitSearch(query, elements);
        }, CONFIG.BENEFIT_SEARCH_DEBOUNCE);
    });
    
    // Handle keyboard navigation
    elements.benefitInput.addEventListener('keydown', (e) => {
        if (!elements.benefitDropdown || 
            !elements.benefitDropdown.style.display || 
            elements.benefitDropdown.style.display === 'none') {
            return;
        }
        
        const options = elements.benefitDropdownContent?.querySelectorAll('.benefit-option') || [];
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                state.benefitSelectedIndex = Math.min(state.benefitSelectedIndex + 1, options.length - 1);
                updateSelection(options);
                break;
            case 'ArrowUp':
                e.preventDefault();
                state.benefitSelectedIndex = Math.max(state.benefitSelectedIndex - 1, -1);
                updateSelection(options);
                break;
            case 'Enter':
                e.preventDefault();
                if (state.benefitSelectedIndex >= 0 && options[state.benefitSelectedIndex]) {
                    selectBenefit(state.currentBenefits[state.benefitSelectedIndex], elements);
                }
                break;
            case 'Escape':
                hideBenefitDropdown(elements);
                break;
        }
    });
    
    // Handle clicks outside dropdown
    document.addEventListener('click', (e) => {
        if (elements.benefitSearchContainer && !elements.benefitSearchContainer.contains(e.target)) {
            hideBenefitDropdown(elements);
        }
    });
    
    // Handle focus
    elements.benefitInput.addEventListener('focus', () => {
        const query = elements.benefitInput.value.trim();
        if (query.length >= CONFIG.MIN_BENEFIT_SEARCH_LENGTH) {
            performBenefitSearch(query, elements);
        }
    });
}

// Perform benefit search
async function performBenefitSearch(query, elements) {
    try {
        showBenefitDropdown(elements);
        if (elements.benefitDropdownContent) {
            elements.benefitDropdownContent.innerHTML = '<div class="benefit-dropdown-loading">Пошук...</div>';
        }
        
        const benefits = await searchBenefits(query);
        state.currentBenefits = benefits;
        
        if (benefits.length === 0) {
            if (elements.benefitDropdownContent) {
                elements.benefitDropdownContent.innerHTML = 
                    `<div class="benefit-dropdown-empty">Нічого не знайдено для запиту "${query}"</div>`;
            }
        } else {
            populateBenefitDropdown(benefits, elements);
        }
        
        if (elements.benefitError) {
            elements.benefitError.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to search benefits:', error);
        if (elements.benefitDropdownContent) {
            elements.benefitDropdownContent.innerHTML = 
                `<div class="benefit-dropdown-error">Помилка пошуку: ${error.message}</div>`;
        }
        if (elements.benefitError) {
            elements.benefitError.textContent = `Помилка пошуку спеціальностей: ${error.message}`;
            elements.benefitError.style.display = 'block';
        }
    }
}

// Populate benefit dropdown with results
function populateBenefitDropdown(benefits, elements) {
    if (!elements.benefitDropdownContent) return;
    
    elements.benefitDropdownContent.innerHTML = '';
    
    benefits.forEach((benefit, index) => {
        const option = document.createElement('div');
        option.className = 'benefit-option';
        option.textContent = benefit;
        option.addEventListener('click', () => selectBenefit(benefit, elements));
        elements.benefitDropdownContent.appendChild(option);
    });
}

// Select a benefit from dropdown
function selectBenefit(benefit, elements) {
    if (elements.benefitInput) {
        elements.benefitInput.value = benefit;
        elements.benefitInput.focus();
    }
    hideBenefitDropdown(elements);
}

// Show benefit dropdown
function showBenefitDropdown(elements) {
    if (elements.benefitDropdown) {
        elements.benefitDropdown.style.display = 'block';
    }
    if (elements.benefitSearchContainer) {
        elements.benefitSearchContainer.classList.add('dropdown-open');
    }
}

// Hide benefit dropdown
function hideBenefitDropdown(elements) {
    if (elements.benefitDropdown) {
        elements.benefitDropdown.style.display = 'none';
    }
    if (elements.benefitSearchContainer) {
        elements.benefitSearchContainer.classList.remove('dropdown-open');
    }
    state.benefitSelectedIndex = -1;
}

// Update keyboard selection
function updateSelection(options) {
    options.forEach((option, index) => {
        option.classList.toggle('selected', index === state.benefitSelectedIndex);
    });
    
    // Scroll selected option into view
    if (state.benefitSelectedIndex >= 0 && options[state.benefitSelectedIndex]) {
        options[state.benefitSelectedIndex].scrollIntoView({ block: 'nearest' });
    }
} 