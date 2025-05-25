// NFZ Appointment Finder - Service Worker
const CACHE_NAME = 'nfz-finder-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/badge.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('Service Worker installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip external API requests - always fetch fresh
    if (event.request.url.includes('api.nfz.gov.pl') || 
        event.request.url.includes('ipapi.co')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

// Background sync for periodic refresh (if supported)
self.addEventListener('sync', event => {
    if (event.tag === 'nfz-refresh') {
        console.log('Background sync: nfz-refresh');
        event.waitUntil(performBackgroundRefresh());
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event);
    
    const data = event.notification.data || {};
    event.notification.close();
    
    if (event.action === 'call' && data.phone) {
        // Open phone dialer
        event.waitUntil(
            clients.openWindow(`tel:${data.phone}`)
        );
    } else {
        // Open app with specific slot
        const url = data.url || './index.html';
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes('index.html') && 'focus' in client) {
                        client.focus();
                        if (data.id) {
                            client.postMessage({
                                type: 'SHOW_SLOT',
                                slotId: data.id
                            });
                        }
                        return;
                    }
                }
                // If app is not open, open it
                return clients.openWindow(url);
            })
        );
    }
});

// Handle messages from main app
self.addEventListener('message', event => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Perform background refresh
async function performBackgroundRefresh() {
    try {
        // Get saved query from storage
        const savedQuery = await getFromStorage('nfzQuery');
        if (!savedQuery) {
            console.log('No saved query for background refresh');
            return;
        }
        
        const query = JSON.parse(savedQuery);
        const url = buildApiUrl(query);
        
        console.log('Performing background refresh for:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Process results and check for improvements
        if (data.data && data.data.length > 0) {
            const bestResult = data.data[0];
            const savedBestDate = await getFromStorage('bestResultDate');
            
            if (!savedBestDate || new Date(bestResult.attributes.dates?.date) < new Date(savedBestDate)) {
                // Found better result, send notification
                await sendBackgroundNotification(bestResult);
                await setInStorage('bestResultDate', bestResult.attributes.dates?.date);
                await setInStorage('bestResultId', bestResult.id);
            }
        }
        
    } catch (error) {
        console.error('Background refresh failed:', error);
    }
}

// Send notification from background
async function sendBackgroundNotification(result) {
    const attr = result.attributes;
    const title = `${attr.benefit} – ${formatDate(attr.dates?.date)}`;
    const body = `${attr.locality}, ${attr.address} Натисніть, щоб переглянути`;
    
    await self.registration.showNotification(title, {
        body: body,
        icon: './icons/icon-192.png',
        badge: './icons/badge.png',
        vibrate: [100, 50, 100],
        data: {
            id: result.id,
            phone: attr.phone,
            url: `./index.html#slot=${result.id}`
        },
        actions: attr.phone ? [{action: 'call', title: '📞 Дзвінок'}] : [],
        requireInteraction: true
    });
}

// Helper function to build API URL (simplified version)
function buildApiUrl(query) {
    const BASE = 'https://api.nfz.gov.pl/app-itl-api';
    const params = new URLSearchParams();
    
    params.append('case', query.case.toString());
    params.append('format', 'json');
    params.append('limit', '25');
    
    if (query.children) {
        params.append('benefitsForChildren', 'Y');
    }
    
    if (query.benefit) {
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

// Format date helper
function formatDate(dateString) {
    if (!dateString) return '–';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
}

// Storage helpers for service worker
async function getFromStorage(key) {
    return new Promise((resolve) => {
        // Since we can't access localStorage directly in SW, we'll use IndexedDB or postMessage
        // For simplicity, we'll return null and rely on main app for storage
        resolve(null);
    });
}

async function setInStorage(key, value) {
    return new Promise((resolve) => {
        // Since we can't access localStorage directly in SW, we'll use IndexedDB or postMessage
        // For simplicity, we'll resolve immediately
        resolve();
    });
}

// Push event handler (for future push notifications)
self.addEventListener('push', event => {
    console.log('Push event received:', event);
    
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: './icons/icon-192.png',
            badge: './icons/badge.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: data.actions || []
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

console.log('Service Worker loaded'); 