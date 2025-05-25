// NFZ Appointment Finder - Legacy Entry Point
// This file provides backward compatibility for any external references to app.js
// The actual application logic has been refactored into modular files in the js/ directory

console.warn('app.js is deprecated. Please use js/app.js instead.');

// Import and re-export the main application module
import('./js/app.js')
    .then(module => {
        console.log('Modular NFZ application loaded successfully');
        // Export main functions to global scope for backward compatibility
        window.nfzApp = module;
    })
    .catch(error => {
        console.error('Failed to load modular NFZ application:', error);
        alert('Помилка завантаження додатку. Будь ласка, оновіть сторінку.');
    }); 