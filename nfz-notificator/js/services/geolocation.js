// NFZ Appointment Finder - Geolocation Service

import { CONFIG } from '../modules/config.js';

// Get user location using browser geolocation API
export async function getUserLocation() {
    try {
        if ('geolocation' in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: CONFIG.GEOLOCATION_TIMEOUT,
                    enableHighAccuracy: false
                });
            });
            
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            console.log('User location obtained via geolocation:', location);
            return location;
        } else {
            console.log('Geolocation not available, trying IP location');
            return await getLocationByIP();
        }
    } catch (error) {
        console.log('Geolocation failed, trying IP location:', error);
        return await getLocationByIP();
    }
}

// Get location by IP as fallback
export async function getLocationByIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.latitude && data.longitude) {
            const location = {
                lat: data.latitude,
                lng: data.longitude
            };
            console.log('Location obtained by IP:', location);
            return location;
        } else {
            throw new Error('No location data in IP response');
        }
    } catch (error) {
        console.log('IP location failed, using default (0,0):', error);
        return { lat: 0, lng: 0 };
    }
}

// Calculate distance using Haversine formula
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Validate coordinates
export function isValidCoordinates(lat, lng) {
    return typeof lat === 'number' && typeof lng === 'number' &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
}

// Format coordinates for display
export function formatCoordinates(lat, lng) {
    if (!isValidCoordinates(lat, lng)) {
        return 'Invalid coordinates';
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
} 