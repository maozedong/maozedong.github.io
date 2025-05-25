# NFZ Appointment Finder

A Progressive Web App (PWA) for finding the earliest and closest NFZ (Polish National Health Fund) appointment slots.

## Features

- 🔍 Search for medical appointments using NFZ API
- 📍 Location-based distance calculation
- 🔔 Push notifications for better appointment slots
- 📱 Progressive Web App (installable on mobile)
- 🇺🇦 Ukrainian interface with Polish medical terms
- 💾 Local storage for search preferences
- 🔄 Automatic periodic refresh

## Usage

1. **Select appointment type**: Choose between "stabilny" (stable) or "pilny" (urgent)
2. **Choose medical specialty**: Enter or select from the dropdown
3. **Select voivodeship**: Required field for location
4. **Optional filters**: Expand "Додаткові фільтри" for city, hospital, etc.
5. **Search**: Click "Знайти терміни" to find appointments
6. **View results**: Top 10 results sorted by date and distance
7. **Enable notifications**: Allow notifications to get alerts for better slots

## Technical Details

### Files Structure
```
sonnet/
├── index.html          # Main HTML file
├── style.css           # Styling
├── app.js              # Main application logic
├── sw.js               # Service worker for PWA
├── manifest.webmanifest # PWA manifest
├── icons/              # App icons
│   ├── icon-192.png
│   ├── icon-512.png
│   └── badge.png
└── README.md           # This file
```

### API Integration
- Uses NFZ Terminy Leczenia v1.3 API
- Base URL: `https://api.nfz.gov.pl/app-itl-api`
- Endpoints: `/benefits`, `/localities`, `/queues`

### Local Storage
- `nfzQuery`: Saved search criteria
- `bestResultDate`: Best appointment date found
- `bestResultId`: ID of best appointment
- `refreshInterval`: Refresh interval in minutes (default: 60)

### Geolocation
- Primary: Browser geolocation API
- Fallback: IP-based location via ipapi.co
- Default: (0,0) if both fail

## Installation

### Local Development
1. Clone/download the files
2. Serve from a local web server (required for PWA features)
3. Open in browser

### GitHub Pages Deployment
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Access via GitHub Pages URL

### Local Server Examples
```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

## Browser Support

- Modern browsers with PWA support
- Service Worker support required
- Geolocation API (optional)
- Notification API (optional)

## Notes

- Icons are currently placeholders - replace with proper medical/calendar icons
- App requires internet connection for API calls
- Notifications require user permission
- Distance calculation uses Haversine formula

## License

This is a demonstration app based on the NFZ API specification. 