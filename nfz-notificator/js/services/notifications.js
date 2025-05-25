// NFZ Appointment Finder - Notifications Service

import { CONFIG, state } from '../modules/config.js';
import { loadBestResult, saveBestResult, clearNotificationData } from './storage.js';
import { formatDate } from '../ui/results.js';

// Update notification status display
export function updateNotificationStatus(elements) {
    if (!elements.notificationStatus) return;
    
    if (!('Notification' in window)) {
        elements.notificationStatus.textContent = 'Не підтримується';
        if (elements.enableNotificationsBtn) {
            elements.enableNotificationsBtn.disabled = true;
        }
        if (elements.disableNotificationsBtn) {
            elements.disableNotificationsBtn.style.display = 'none';
        }
        return;
    }
    
    switch (Notification.permission) {
        case 'granted':
            elements.notificationStatus.textContent = 'Увімкнені ✅';
            if (elements.enableNotificationsBtn) {
                elements.enableNotificationsBtn.style.display = 'none';
            }
            if (elements.disableNotificationsBtn) {
                elements.disableNotificationsBtn.style.display = 'inline-flex';
            }
            setupPeriodicRefresh();
            break;
        case 'denied':
            elements.notificationStatus.textContent = 'Заблоковані ❌';
            if (elements.enableNotificationsBtn) {
                elements.enableNotificationsBtn.disabled = true;
            }
            if (elements.disableNotificationsBtn) {
                elements.disableNotificationsBtn.style.display = 'none';
            }
            break;
        default:
            elements.notificationStatus.textContent = 'Вимкнені';
            if (elements.enableNotificationsBtn) {
                elements.enableNotificationsBtn.disabled = false;
                elements.enableNotificationsBtn.style.display = 'inline-flex';
            }
            if (elements.disableNotificationsBtn) {
                elements.disableNotificationsBtn.style.display = 'none';
            }
            break;
    }
}

// Handle notification permission request
export async function handleNotificationPermission(elements) {
    if (!('Notification' in window)) {
        alert('Ваш браузер не підтримує сповіщення');
        return;
    }
    
    if (Notification.permission === 'granted') {
        alert('Сповіщення вже увімкнені');
        return;
    }
    
    const permission = await Notification.requestPermission();
    updateNotificationStatus(elements);
    
    if (permission === 'granted') {
        setupPeriodicRefresh();
    }
}

// Handle disable notifications
export function handleDisableNotifications(elements) {
    // Clear periodic refresh
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
    
    // Clear test notifications
    if (state.testNotificationInterval) {
        clearInterval(state.testNotificationInterval);
        state.testNotificationInterval = null;
        if (elements.testNotificationsBtn) {
            elements.testNotificationsBtn.textContent = '🧪 Тестові сповіщення';
        }
        if (elements.testNotificationStatus) {
            elements.testNotificationStatus.textContent = 'Вимкнені';
        }
    }
    
    // Clear saved notification data
    clearNotificationData();
    
    // Update UI
    if (elements.enableNotificationsBtn) {
        elements.enableNotificationsBtn.style.display = 'inline-flex';
        elements.enableNotificationsBtn.disabled = false;
    }
    if (elements.disableNotificationsBtn) {
        elements.disableNotificationsBtn.style.display = 'none';
    }
    if (elements.notificationStatus) {
        elements.notificationStatus.textContent = 'Вимкнені';
    }
    
    alert('Сповіщення вимкнені');
}

// Setup periodic refresh
export function setupPeriodicRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
    }
    
    const interval = parseInt(localStorage.getItem('refreshInterval') || '60');
    const savedQuery = localStorage.getItem('nfzQuery');
    
    if (savedQuery && interval > 0) {
        state.refreshInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                console.log('Performing periodic refresh');
                // Import handleRefresh dynamically to avoid circular dependency
                const { handleRefresh } = await import('../app.js');
                await handleRefresh();
            }
        }, interval * 60 * 1000);
    }
}

// Check for better results and send notifications
export function checkForBetterResults(results, elements) {
    if (results.length === 0) return;
    
    const bestResult = results[0];
    const { date: savedBestDate, id: savedBestId } = loadBestResult();
    const dateThreshold = elements.notificationDateThreshold?.value;
    
    // Check if result meets date threshold
    if (dateThreshold && new Date(bestResult.date) > new Date(dateThreshold)) {
        return; // Don't notify if date is after threshold
    }
    
    // Check if we have a better (earlier) date or it's a new search
    if (!savedBestDate || new Date(bestResult.date) < new Date(savedBestDate) || savedBestId !== bestResult.id) {
        saveBestResult(bestResult.date, bestResult.id);
        
        // Send notification if permission granted and it's not the first search
        if (savedBestDate && 'Notification' in window && Notification.permission === 'granted') {
            sendNotification(bestResult);
        }
    }
}

// Send notification
export function sendNotification(result) {
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
        }
        // Note: actions are not supported for main thread notifications
    });
    
    notification.onclick = () => {
        window.focus();
        // Import showDetails dynamically to avoid circular dependency
        import('../ui/results.js').then(({ showDetails }) => {
            const elements = window.nfzElements || {};
            showDetails(result.id, elements);
        });
        notification.close();
    };
}

// Handle test notifications toggle
export function handleTestNotifications(elements) {
    if (!('Notification' in window)) {
        alert('Ваш браузер не підтримує сповіщення');
        return;
    }
    
    if (Notification.permission !== 'granted') {
        alert('Спочатку увімкніть сповіщення');
        return;
    }
    
    if (state.testNotificationInterval) {
        // Stop test notifications
        clearInterval(state.testNotificationInterval);
        state.testNotificationInterval = null;
        if (elements.testNotificationsBtn) {
            elements.testNotificationsBtn.textContent = '🧪 Тестові сповіщення';
        }
        if (elements.testNotificationStatus) {
            elements.testNotificationStatus.textContent = 'Вимкнені';
        }
    } else {
        // Start test notifications
        state.testNotificationInterval = setInterval(() => {
            sendTestNotification();
        }, CONFIG.TEST_NOTIFICATION_INTERVAL);
        
        if (elements.testNotificationsBtn) {
            elements.testNotificationsBtn.textContent = '🛑 Зупинити тестові';
        }
        if (elements.testNotificationStatus) {
            elements.testNotificationStatus.textContent = 'Увімкнені ✅';
        }
        
        // Send first test notification immediately
        sendTestNotification();
    }
}

// Send test notification with stub data
function sendTestNotification() {
    const testData = {
        benefit: 'PORADA LEKARSKA',
        date: getRandomFutureDate(),
        locality: 'Warszawa',
        address: 'ul. Testowa 123',
        distance: Math.random() * 10 + 1, // Random distance between 1-11 km
        provider: 'Testowy Szpital',
        phone: '+48 123 456 789',
        id: 'test-' + Date.now()
    };
    
    const title = `${testData.benefit} – ${formatDate(testData.date)}`;
    const body = `${testData.locality}, ${testData.address} (${testData.distance.toFixed(1)} км) [ТЕСТ] Натисніть, щоб переглянути`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            id: testData.id,
            phone: testData.phone,
            url: `/index.html#slot=${testData.id}`,
            isTest: true
        }
        // Note: actions are not supported for main thread notifications
    });
    
    notification.onclick = () => {
        window.focus();
        alert('Це тестове сповіщення. Реальні дані будуть показані після пошуку.');
        notification.close();
    };
}

// Generate random future date within next 30 days
function getRandomFutureDate() {
    const now = new Date();
    const futureDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split('T')[0];
} 