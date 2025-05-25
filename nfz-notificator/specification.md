# NFZ Appointment Finder – Lightweight Web App Specification (v 1.1)

---

## 1 Purpose

A single‑page, self‑hosted Progressive Web App (PWA) that lets a private user search the public **NFZ Terminy Leczenia v 1.3 API** for the earliest and geographically closest appointment slots matching given criteria, store those criteria locally, re‑check periodically, and send actionable Android notifications with a one‑tap phone dial‑out.

## 2 Scope & Constraints

* Weekend‑sized codebase: just static files served by **GitHub Pages**.
* Pure browser stack: **HTML 5, CSS Grid/Flexbox, ES2020 modules**.  No frameworks or bundlers.
* State in **`localStorage`** only; no backend database.
* Interface language: Ukrainian; domain terms (specialities, administrative units) remain Polish.

---

## 3 User Interface and Input Logic

The form recreates the controls visible in the official NFZ search (see screenshot) using native elements.  Required fields are first‑level; seldom‑used fields are wrapped in `<details>`.

| # | Polish label (kept)            | Control                       | Data source                                                           | Ukrainian caption       |
| - | ------------------------------ | ----------------------------- | --------------------------------------------------------------------- | ----------------------- |
| 1 | przypadek *(stabilny / pilny)* | `<input type="radio">`        | Hard‑coded: `1=stabilny`, `2=pilny`                                   | «Тип випадку»           |
| 2 | świadczenia udzielane dzieciom | `<input type="checkbox">`     | boolean                                                               | «Для дітей»             |
| 3 | jakiego świadczenia szukasz?   | `<input list="benefitList">`  | Fetched once from **`GET /benefits`** (see § 11.3); fallback snapshot | «Яке świadczenie?»      |
| 4 | województwo                    | `<select>`                    | Static 16‑item list (§ 11.2)                                          | «Воєводство»            |
| 5 | miejscowość                    | `<input list="localityList">` | Lazy fetch `GET /localities?province=…`                               | «Місто»                 |
| 6 | szpital/przychodnia            | `<input>` free text           | n/a                                                                   | «Шпиталь / поліклініка» |
| 7 | miejsce udzielania świadczeń   | `<input>` free text           | n/a                                                                   | «Місце надання»         |
| 8 | ulica                          | `<input>` free text           | n/a                                                                   | «Вулиця»                |

The settings section, available under a `<details>` element, includes:
*   **Refresh Interval**: `<input type="number">` for setting periodic refresh time in minutes.
*   **Enable/Disable Notifications**: Buttons to manage push notification permissions.
*   **Notification Date Threshold**: `<input type="date">` to set a cut-off date for appointment notifications. The input is pre-filled with the earliest date from the current search results if no threshold is already set by the user.

---

## 4 Data Flow and Algorithm

### 4.1 Constants

```js
const BASE = 'https://api.nfz.gov.pl/app-itl-api'; // § 11.1
```

### 4.2 Building the query (`buildQueryObject()`)

The form fields are mapped to **`/queues`** query parameters as follows:

| Form control                      | Query key             | Example                   | Notes                                                                              |
| --------------------------------- | --------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| przypadek                         | `case`                | `1`                       | `1=stabilny`, `2=pilny`                                                            |
| świadczenia udzielane dzieciom    | `benefitsForChildren` | `Y`                       | `Y` or `N`; omit if unchecked                                                      |
| beneficj *(jakiego świadczenia…)* | `benefit`             | `S01` *or* free‑text      | Pass **ID** if selected from list; otherwise raw string (API does substring match) |
| województwo                       | `province`            | `07`                      | Two‑digit code (§ 11.2)                                                            |
| miejscowość                       | `locality`            | `Warszawa`                | *optional*                                                                         |
| szpital/przychodnia               | `provider`            | `CSK UCK`                 | *optional*; substring                                                              |
| miejsce udzielania świadczeń      | `place`               | `Poradnia Kardiologiczna` | *optional*                                                                         |
| ulica                             | `street`              | `Kopernika`               | *optional*                                                                         |

The composed URL looks like

```
`${BASE}/queues?case=1&province=07&benefit=S01&limit=25&format=json`
```

`limit` is fixed to **25**; pagination is ignored because the goal is "earliest date".

### 4.3 Fetching & Ranking (`fetchAndRank()`)

1. `GET /queues` returns a JSON‑API document (§ 11.4).
2. Extract each `data[i].attributes` into a plain object.
3. Obtain user coordinates via `navigator.geolocation`; fallback `(0,0)` if denied.
4. Compute distance (km) with the Haversine formula.
5. Sort by `firstAvailableDate` (ascending) then `distance` (ascending).

---

## 5 Results Display

The app displays the **top 10** results from the search, adapting its presentation based on screen size:

*   **Desktop View**: Results are shown in a `<table id="results-table">`.
    | Column              | Source                                      |
    | ------------------- | ------------------------------------------- |
    | Date (dd mm yyyy)   | `attributes.dates.date`                     |
    | Speciality (Polish) | `attributes.benefit`                        |
    | Facility            | `attributes.provider`                       |
    | Address             | `attributes.address`, `attributes.locality` |
    | Distance (km)       | computed `dist.toFixed(1)`                  |
    | Phone               | `attributes.phone ?? '–'`                   |

*   **Mobile View**: Results are shown in a list of cards (`<div id="results-cards">`). Each card displays:
    *   **Header**: Appointment Date and Distance (e.g., "2.3 км").
    *   **Title**: Speciality (Polish).
    *   **Provider**: Facility name.
    *   **Address**: Full address with a 📍 icon.
    *   **Actions**: 
        *   Phone (if available, e.g., "📞 +48123456789").
        *   Navigation Link (e.g., "🗺️ Навігація", linking to Google Maps with facility coordinates).

Clicking a row (desktop) or a card (mobile) calls `showDetails(id)` which updates `location.hash = 'slot='+id`. The details view also provides a navigation link (e.g., to Google Maps) instead of raw coordinates.

---

## 6 State Management (localStorage)

```ts
interface NFZQuery {
  case: 1|2;
  children: boolean;
  benefit: string;      // ID or raw name
  province: string;     // '01' … '16'
  locality?: string;
  provider?: string;
  place?: string;
  street?: string;
}
localStorage.nfzQuery        // JSON.stringify(NFZQuery)
localStorage.bestResultDate  // ISO date string
localStorage.bestResultId    // queue id
localStorage.refreshInterval // minutes (number)
localStorage.notificationDateThreshold // ISO date string, optional; for filtering notifications
```

---

## 7 Periodic Refresh & Notifications

### 7.1 Scheduling

*If `registration.periodicSync` exists*: `reg.periodicSync.register('nfz-refresh', {minInterval: refreshInterval*60*1000})`.
*Else*: `setInterval(checkAppointments, refreshInterval*60*1000)` while the page is visible.

### 7.2 Notification Payload (authoritative)

Notifications are sent only if the appointment date is on or before the `notificationDateThreshold` (if set by the user).

```js
{
  title: `${attr.benefit} – ${fmtDate(attr.dates.date)}`,
  body: `${attr.locality}, ${attr.address} (${distKm} км)  Натисніть, щоб переглянути`,
  icon: '/icons/icon-192.png',
  badge: '/icons/badge.png',
  vibrate: [100,50,100],
  data: {
    id: queue.id,
    phone: attr.phone,            // may be null
    url: `/index.html#slot=${queue.id}`
  },
  actions: attr.phone ? [{action:'call', title:'📞 Дзвінок'}] : []
}
```

The **Ukrainian hint** text is the static phrase: **« Натисніть, щоб переглянути »** immediately after the distance.

### 7.3 Service‑worker click handler

```js
self.addEventListener('notificationclick', ev => {
  const d = ev.notification.data||{};
  if (ev.action==='call' && d.phone) {
    clients.openWindow(`tel:${d.phone}`);
  } else {
    clients.openWindow(d.url || '/');
  }
});
```

---

## 8 Files & Deployment

```
/          – Git root
  index.html           // markup + <datalist> dicts
  style.css            // light CSS
  app.js               // logic modules
  sw.js                // service‑worker
  icons/{icon-192.png,badge.png}
  manifest.webmanifest // PWA manifest
```

Push to `main` branch → GitHub Pages → done.

---

## 9 Appendix: Reference Data & Schemas

### 9.1 API Base URL (answer)

`