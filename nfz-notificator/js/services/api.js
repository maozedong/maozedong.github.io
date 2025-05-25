// NFZ Appointment Finder - API Service

import { CONFIG } from '../modules/config.js';
import { calculateDistance } from './geolocation.js';

// Search benefits from API
export async function searchBenefits(query) {
    try {
        const url = `${CONFIG.BASE_URL}/benefits?format=json&name=${encodeURIComponent(query)}&limit=20`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to search benefits:', error);
        throw error;
    }
}

// Load localities for a province
export async function loadLocalities(province) {
    try {
        const url = `${CONFIG.BASE_URL}/localities?province=${province}&format=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to load localities:', error);
        throw error;
    }
}

// Build query object from form
export function buildQueryObject(formElement) {
    const formData = new FormData(formElement);
    const query = {
        case: parseInt(formData.get('case')),
        children: document.getElementById('children').checked,
        benefit: document.getElementById('benefit').value.trim(),
        province: document.getElementById('province').value
    };
    
    // Add optional fields
    const locality = document.getElementById('locality').value.trim();
    if (locality) query.locality = locality;
    
    const provider = document.getElementById('provider')?.value.trim();
    if (provider) query.provider = provider;
    
    const place = document.getElementById('place')?.value.trim();
    if (place) query.place = place;
    
    const street = document.getElementById('street')?.value.trim();
    if (street) query.street = street;
    
    return query;
}

// Build API URL from query object
export function buildApiUrl(query) {
    const params = new URLSearchParams();
    
    params.append('case', query.case.toString());
    params.append('format', 'json');
    params.append('limit', CONFIG.API_LIMIT.toString());
    
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
    
    return `${CONFIG.BASE_URL}/queues?${params.toString()}`;
}

// Fetch and rank appointments
export async function fetchAndRankAppointments(query, userLocation) {
    const url = buildApiUrl(query);
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process results and filter out past appointments
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today
    
    const results = data.data
        .map(item => {
            const attr = item.attributes;
            const distance = calculateDistance(
                userLocation.lat, userLocation.lng,
                attr.latitude || 0, attr.longitude || 0
            );
            
            return {
                id: item.id,
                date: attr.dates?.date || '',
                updatedDate: attr.dates?.['date-situation-as-at'] || attr.dates?.date || '',
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
        })
        .filter(result => {
            // Filter out past appointments
            if (!result.date) return true; // Keep if no date
            const appointmentDate = new Date(result.date);
            return appointmentDate >= now;
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

// Validate query before API call
export function validateQuery(query) {
    const errors = [];
    
    if (!query.case || (query.case !== 1 && query.case !== 2)) {
        errors.push('Невірний тип випадку');
    }
    
    if (!query.province) {
        errors.push('Воєводство є обов\'язковим полем');
    }
    
    if (!query.benefit || query.benefit.length < 3) {
        errors.push('Назва спеціальності повинна містити принаймні 3 символи');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
} 