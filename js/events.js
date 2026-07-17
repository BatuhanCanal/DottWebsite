/* ========================================
   Gazi DOTT — Events Manager
   Fetch, render, and filter events
   Static-first: local overrides + JSON fallback
   ======================================== */

// In-memory cache for events (avoids redundant fetches)
let _eventsCache = null;
let _eventsCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

// In-memory cache for categories
let _categoriesCache = null;
let _categoriesCacheTime = 0;
const EVENTS_STORAGE_KEY = 'dott-events-data';
const CATEGORIES_STORAGE_KEY = 'dott-categories-data';

function readStoredArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeStoredArray(key, data) {
    if (!Array.isArray(data)) return;
    localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Get all events from local overrides or static JSON.
 */
async function getEvents() {
    const now = Date.now();
    if (_eventsCache && (now - _eventsCacheTime) < CACHE_TTL) {
        return _eventsCache;
    }

    const stored = readStoredArray(EVENTS_STORAGE_KEY);
    if (stored) {
        _eventsCache = stored;
        _eventsCacheTime = now;
        return _eventsCache;
    }

    try {
        const response = await fetch('data/events.json');
        if (!response.ok) throw new Error('Failed to fetch events');
        _eventsCache = await response.json();
        _eventsCacheTime = now;
        return _eventsCache;
    } catch (err) {
        console.error('Error fetching events:', err);
        return _eventsCache || [];
    }
}

/**
 * Invalidate the events cache (call after mutations)
 */
function invalidateEventsCache() {
    _eventsCache = null;
    _eventsCacheTime = 0;
}

function setEventsData(events) {
    const normalized = Array.isArray(events) ? events : [];
    writeStoredArray(EVENTS_STORAGE_KEY, normalized);
    _eventsCache = normalized;
    _eventsCacheTime = Date.now();
}

function resetEventsData() {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    invalidateEventsCache();
}

/**
 * Get all categories from local overrides or static JSON.
 */
async function getCategories() {
    const now = Date.now();
    if (_categoriesCache && (now - _categoriesCacheTime) < CACHE_TTL) {
        return _categoriesCache;
    }

    const stored = readStoredArray(CATEGORIES_STORAGE_KEY);
    if (stored) {
        _categoriesCache = stored;
        _categoriesCacheTime = now;
        return _categoriesCache;
    }

    try {
        const response = await fetch('data/categories.json');
        if (!response.ok) throw new Error('Failed to fetch categories');
        _categoriesCache = await response.json();
        _categoriesCacheTime = now;
        return _categoriesCache;
    } catch (err) {
        console.error('Error fetching categories:', err);
        return _categoriesCache || [];
    }
}

/**
 * Invalidate the categories cache
 */
function invalidateCategoriesCache() {
    _categoriesCache = null;
    _categoriesCacheTime = 0;
}

function setCategoriesData(categories) {
    const normalized = Array.isArray(categories) ? categories : [];
    writeStoredArray(CATEGORIES_STORAGE_KEY, normalized);
    _categoriesCache = normalized;
    _categoriesCacheTime = Date.now();
}

function resetCategoriesData() {
    localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    invalidateCategoriesCache();
}

/**
 * Get event title based on current language
 */
function getEventTitle(event) {
    return currentLang === 'tr' ? (event.title_tr || event.title_en) : (event.title_en || event.title_tr);
}

/**
 * Get event description based on current language
 */
function getEventDesc(event) {
    return currentLang === 'tr' ? (event.description_tr || event.description_en) : (event.description_en || event.description_tr);
}

/**
 * Return chronologically sorted sessions while supporting legacy date/time fields.
 */
function getEventSessions(event) {
    const source = Array.isArray(event.sessions) && event.sessions.length > 0
        ? event.sessions
        : (event.date ? [{ date: event.date, time: event.time || '' }] : []);

    return source
        .map((session, index) => ({
            date: String(session?.date || '').trim(),
            time: String(session?.time || '').trim(),
            label_tr: String(session?.label_tr || session?.label || '').trim(),
            label_en: String(session?.label_en || session?.label || '').trim(),
            _order: index,
        }))
        .filter(session => /^\d{4}-\d{2}-\d{2}$/.test(session.date))
        .sort((a, b) => {
            const timeDiff = getSessionTimestamp(a) - getSessionTimestamp(b);
            return timeDiff || a._order - b._order;
        })
        .map(({ _order, ...session }) => session);
}

function getSessionTimestamp(session, endOfDay = false) {
    if (!session?.date) return Number.NaN;
    const fallbackTime = endOfDay ? '23:59:59' : '00:00:00';
    const time = session.time ? `${session.time}:00`.slice(0, 8) : fallbackTime;
    return new Date(`${session.date}T${time}`).getTime();
}

function getEventDisplaySession(event, now = Date.now()) {
    const sessions = getEventSessions(event);
    if (sessions.length === 0) return null;

    return sessions.find(session => getSessionTimestamp(session, true) >= now)
        || sessions[sessions.length - 1];
}

function isEventUpcoming(event, now = Date.now()) {
    return getEventSessions(event).some(session => getSessionTimestamp(session, true) >= now);
}

function getEventSortTimestamp(event, now = Date.now()) {
    const displaySession = getEventDisplaySession(event, now);
    return displaySession ? getSessionTimestamp(displaySession) : 0;
}

function getSafeExternalUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

/**
 * Return named action links while supporting the legacy single link field.
 */
function getEventLinks(event) {
    const source = Array.isArray(event.links) && event.links.length > 0
        ? event.links
        : (event.link ? [{ url: event.link }] : []);

    return source
        .map(link => ({
            label_tr: String(link?.label_tr || link?.label || '').trim(),
            label_en: String(link?.label_en || link?.label || '').trim(),
            url: getSafeExternalUrl(link?.url || link?.link),
        }))
        .filter(link => link.url);
}

function getSessionLabel(session, index, total) {
    const label = currentLang === 'tr'
        ? (session.label_tr || session.label_en)
        : (session.label_en || session.label_tr);
    if (label) return label;
    return total > 1 ? `${index + 1}. ${t('events.session')}` : '';
}

function getEventLinkLabel(link) {
    return currentLang === 'tr'
        ? (link.label_tr || link.label_en || t('events.details'))
        : (link.label_en || link.label_tr || t('events.details'));
}

/**
 * Color map for category badges (uses shared COLOR_CONFIG from common.js)
 */
const COLOR_MAP = COLOR_CONFIG.badge;

/**
 * Get category badge HTML (dynamic — uses cached categories)
 */
function getCategoryBadge(categoryId) {
    const cats = _categoriesCache || [];
    const cat = cats.find(c => c.id === categoryId);

    let colorSet = COLOR_MAP.gray;
    let label = categoryId;

    if (cat) {
        colorSet = COLOR_MAP[cat.color] || COLOR_MAP.gray;
        label = currentLang === 'tr' ? (cat.name_tr || cat.name_en) : (cat.name_en || cat.name_tr);
    }

    return `<span class="px-2 py-0.5 rounded ${colorSet.bg} ${colorSet.text} text-[10px] font-bold uppercase tracking-wider border ${colorSet.border}">${escapeHTML(label)}</span>`;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', options);
}

/**
 * Format short date (e.g., "Mar 15")
 */
function formatShortDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    const options = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', options);
}

/**
 * Format day of week
 */
function formatDayOfWeek(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long' });
}

function renderEventSessions(event, compact = false) {
    const sessions = getEventSessions(event);
    if (sessions.length === 0) return '';

    if (compact) {
        return `<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            ${sessions.map((session, index) => {
                const label = escapeHTML(getSessionLabel(session, index, sessions.length));
                return `<span class="inline-flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[14px] text-primary">calendar_today</span>
                    ${label ? `<strong class="font-bold text-white">${label}</strong>` : ''}
                    <span>${formatDate(session.date)}${session.time ? `, ${escapeHTML(session.time)}` : ''}</span>
                </span>`;
            }).join('')}
        </div>`;
    }

    return `<div class="border-y border-border-dark/70">
        ${sessions.map((session, index) => {
            const label = escapeHTML(getSessionLabel(session, index, sessions.length));
            return `<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-xs ${index > 0 ? 'border-t border-border-dark/60' : ''}">
                <span class="inline-flex items-center gap-1.5 font-bold text-white">
                    <span class="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                    ${label || t('events.dateLabel')}
                </span>
                <span class="text-text-muted">${formatDate(session.date)}${session.time ? ` · ${escapeHTML(session.time)}` : ''}</span>
            </div>`;
        }).join('')}
    </div>`;
}

function renderEventActions(event, className = '') {
    return getEventLinks(event).map(link => {
        const label = escapeHTML(getEventLinkLabel(link));
        const url = escapeHTML(link.url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${className}" aria-label="${label}">
            <span class="max-w-40 truncate">${label}</span>
            <span class="material-symbols-outlined text-[16px]">north_east</span>
        </a>`;
    }).join('');
}

/**
 * Render a featured event card (large, horizontal)
 */
function renderFeaturedCard(event) {
    const safeImage = escapeHTML(event.image) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80';
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeDesc = escapeHTML(getEventDesc(event));
    const safeLocation = escapeHTML(event.location);
    const sessions = getEventSessions(event);
    const displaySession = getEventDisplaySession(event);
    const actions = renderEventActions(event, 'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-background-dark');

    return `
    <article class="hud-panel card-hover image-zoom group h-full">
        <div class="grid h-full sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div class="relative min-h-52 overflow-hidden border-b border-border-dark sm:min-h-full sm:border-b-0 sm:border-r">
                <img src="${safeImage}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-background-dark/20 to-transparent sm:bg-gradient-to-r"></div>
                <div class="absolute bottom-4 left-4 rounded-lg border border-primary/35 bg-background-dark/85 px-3 py-2 backdrop-blur">
                    <span class="block text-[10px] font-bold uppercase text-text-muted">${t('events.dateLabel')}</span>
                    <span class="block text-sm font-bold text-white">${displaySession ? formatShortDate(displaySession.date) : ''}${sessions.length > 1 ? ` +${sessions.length - 1}` : ''}</span>
                </div>
            </div>
            <div class="flex min-w-0 flex-col justify-between p-5 sm:p-6">
                <div>
                    <div class="mb-4 flex flex-wrap items-center gap-2">
                        ${getCategoryBadge(event.category)}
                        ${displaySession?.time ? `<span class="flex items-center gap-1 text-xs text-text-muted"><span class="material-symbols-outlined text-[15px] text-primary">schedule</span>${escapeHTML(displaySession.time)}</span>` : ''}
                    </div>
                    <h3 class="mb-3 text-xl font-bold leading-tight text-white transition-colors group-hover:text-primary">
                        ${safeTitle}</h3>
                    <p class="mb-5 line-clamp-3 text-sm leading-6 text-text-muted">${safeDesc}</p>
                    ${renderEventSessions(event, true)}
                </div>
                <div class="mt-5 flex flex-col gap-3 border-t border-border-dark/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
                        <span class="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        <span>${safeLocation || ''}</span>
                    </div>
                    ${actions ? `<div class="flex flex-wrap gap-2 sm:justify-end">${actions}</div>` : ''}
                </div>
            </div>
        </div>
    </article>`;
}

/**
 * Render a detailed event card (larger, 2-column layout)
 */
function renderEventCard(event) {
    const safeImage = escapeHTML(event.image) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80';
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeDesc = escapeHTML(getEventDesc(event));
    const safeLocation = escapeHTML(event.location);
    const sessions = getEventSessions(event);
    const displaySession = getEventDisplaySession(event);
    const dayOfWeek = displaySession ? formatDayOfWeek(displaySession.date) : '';
    const actions = renderEventActions(event, 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-background-dark');

    return `
    <article class="hud-panel card-hover image-zoom group flex h-full flex-col">
        <div class="relative aspect-[16/9] w-full overflow-hidden border-b border-border-dark">
            <img src="${safeImage}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-background-dark/95 via-background-dark/10 to-transparent"></div>
            <div class="absolute left-4 top-4">
                ${getCategoryBadge(event.category)}
            </div>
            ${displaySession ? `<div class="absolute right-4 top-4 rounded-lg border border-primary/30 bg-primary px-3 py-1.5 text-xs font-bold text-background-dark shadow-lg">
                ${formatShortDate(displaySession.date)}${sessions.length > 1 ? ` +${sessions.length - 1}` : ''}
            </div>` : ''}
            <div class="absolute bottom-0 left-0 right-0 p-5">
                <h3 class="text-xl font-bold leading-tight text-white drop-shadow-lg transition-colors group-hover:text-primary">
                    ${safeTitle}
                </h3>
            </div>
        </div>
        <div class="flex flex-1 flex-col space-y-4 p-5">
            <div class="flex flex-wrap gap-2">
                ${safeLocation ? `
                <div class="hud-panel-muted flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted">
                    <span class="material-symbols-outlined text-[15px] text-primary">${event.location?.toLowerCase() === 'online' || event.location?.toLowerCase() === 'çevrimiçi' ? 'videocam' : 'location_on'}</span>
                    <span>${safeLocation}</span>
                </div>` : ''}
            </div>
            ${renderEventSessions(event)}
            <p class="line-clamp-3 text-sm leading-6 text-text-muted">${safeDesc}</p>
            <div class="mt-auto flex flex-col gap-3 border-t border-border-dark/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span class="text-xs capitalize text-text-muted/70">${dayOfWeek}</span>
                ${actions ? `<div class="flex flex-wrap gap-2 sm:justify-end">${actions}</div>` : ''}
            </div>
        </div>
    </article>`;
}

/**
 * Render a past event row
 */
function renderPastEventRow(event) {
    const displaySession = getEventDisplaySession(event);
    const date = new Date(`${displaySession?.date || event.date}T00:00:00`);
    const monthYear = date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeLocation = escapeHTML(event.location);
    const actions = renderEventActions(event, 'inline-flex min-h-8 items-center gap-1 rounded-lg border border-border-dark px-2.5 text-xs font-bold text-text-muted transition-colors hover:border-primary/40 hover:text-primary');

    return `
    <div class="hud-panel-muted block p-3 transition-colors hover:border-primary/35 sm:p-4">
        <div class="flex items-start justify-between gap-3 sm:items-center">
            <div class="flex min-w-0 flex-1 flex-wrap items-start gap-2 sm:items-center sm:gap-4">
                <div class="shrink-0 rounded border border-border-dark bg-background-dark px-2 py-1 font-mono text-[10px] text-primary sm:text-xs">${monthYear}</div>
                <span class="text-sm font-medium text-white sm:text-base">${safeTitle}</span>
                ${getCategoryBadge(event.category)}
                ${safeLocation ? `<span class="text-xs text-text-muted flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${safeLocation}</span>` : ''}
            </div>
            ${actions ? `<div class="flex flex-wrap justify-end gap-2">${actions}</div>` : ''}
        </div>
    </div>`;
}

function renderEmptyState(icon, message) {
    return `<div class="hud-panel-muted col-span-full flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center text-text-muted">
        <span class="material-symbols-outlined mb-4 text-4xl text-primary">${icon}</span>
        <p class="max-w-md text-sm leading-6">${message}</p>
    </div>`;
}

/**
 * Build dynamic filter buttons from categories
 */
async function buildFilterBar() {
    const container = document.getElementById('filter-buttons');
    if (!container) return;

    const categories = await getCategories();

    let html = `<button onclick="filterEvents('all')" data-filter="all"
        class="filter-btn min-h-10 whitespace-nowrap rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-bold text-background-dark"
        data-i18n="events.filter.all">${t('events.filter.all')}</button>`;

    categories.forEach(cat => {
        const label = currentLang === 'tr' ? (cat.name_tr || cat.name_en) : (cat.name_en || cat.name_tr);
        html += `<button onclick="filterEvents('${escapeHTML(cat.id)}')" data-filter="${escapeHTML(cat.id)}"
            class="filter-btn min-h-10 whitespace-nowrap rounded-lg border border-border-dark bg-card-dark/45 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary/60 hover:text-white">${escapeHTML(label)}</button>`;
    });

    container.innerHTML = html;
}

/**
 * Render events on the Events page
 */
async function renderEvents(filter = 'all') {
    const container = document.getElementById('events-grid');
    const pastContainer = document.getElementById('past-events-list');
    if (!container) return;

    // Ensure categories are loaded for badges
    await getCategories();

    const events = await getEvents();
    const now = new Date().getTime();

    let upcoming = events.filter(e => isEventUpcoming(e, now) && e.category !== 'gamejam');
    let past = events.filter(e => !isEventUpcoming(e, now) && e.category !== 'gamejam');

    if (filter !== 'all') {
        upcoming = upcoming.filter(e => e.category === filter);
        past = past.filter(e => e.category === filter);
    }

    upcoming.sort((a, b) => getEventSortTimestamp(a, now) - getEventSortTimestamp(b, now));
    past.sort((a, b) => getEventSortTimestamp(b, now) - getEventSortTimestamp(a, now));

    if (upcoming.length === 0) {
        container.innerHTML = renderEmptyState('event_busy', t('events.noEvents'));
    } else {
        container.innerHTML = upcoming.map(e => renderEventCard(e)).join('');
    }

    if (pastContainer) {
        if (past.length === 0) {
            pastContainer.innerHTML = '';
        } else {
            pastContainer.innerHTML = past.map(e => `<div class="opacity-70 hover:opacity-100 transition-opacity">${renderEventCard(e)}</div>`).join('');
        }
    }
}

/**
 * Render game jams on the Game Jams page
 */
async function renderGameJams() {
    const container = document.getElementById('gamejams-grid');
    const pastContainer = document.getElementById('past-jams-list');
    if (!container) return;

    // Ensure categories are loaded for badges
    await getCategories();

    const events = await getEvents();
    const now = new Date().getTime();

    const upcomingJams = events
        .filter(e => e.category === 'gamejam' && isEventUpcoming(e, now))
        .sort((a, b) => getEventSortTimestamp(a, now) - getEventSortTimestamp(b, now));

    const pastJams = events
        .filter(e => e.category === 'gamejam' && !isEventUpcoming(e, now))
        .sort((a, b) => getEventSortTimestamp(b, now) - getEventSortTimestamp(a, now));

    if (upcomingJams.length === 0) {
        container.innerHTML = renderEmptyState('sports_esports', t('gamejams.noJams'));
    } else {
        container.innerHTML = upcomingJams.map(e => renderEventCard(e)).join('');
    }

    if (pastContainer) {
        if (pastJams.length === 0) {
            pastContainer.innerHTML = '';
        } else {
            pastContainer.innerHTML = pastJams.map(e => `<div class="opacity-70 hover:opacity-100 transition-opacity">${renderEventCard(e)}</div>`).join('');
        }
    }
}

/**
 * Render homepage featured content
 */
async function renderHomePage() {
    // Ensure categories are loaded for badges
    await getCategories();

    const events = await getEvents();
    const now = new Date().getTime();

    // Featured workshops (next 2)
    const workshopsContainer = document.getElementById('home-workshops');
    if (workshopsContainer) {
        const workshops = events
            .filter(e => e.category === 'workshop' && isEventUpcoming(e, now))
            .sort((a, b) => getEventSortTimestamp(a, now) - getEventSortTimestamp(b, now))
            .slice(0, 2);

        if (workshops.length > 0) {
            workshopsContainer.innerHTML = workshops.map(e => renderFeaturedCard(e)).join('');
        } else {
            workshopsContainer.innerHTML = renderEmptyState('draw', t('events.noEvents'));
        }
    }

    // Upcoming events (next 3)
    const eventsContainer = document.getElementById('home-events');
    if (eventsContainer) {
        const upcoming = events
            .filter(e => isEventUpcoming(e, now))
            .sort((a, b) => getEventSortTimestamp(a, now) - getEventSortTimestamp(b, now))
            .slice(0, 3);

        if (upcoming.length > 0) {
            eventsContainer.innerHTML = upcoming.map(e => renderEventCard(e)).join('');
        } else {
            eventsContainer.innerHTML = renderEmptyState('event_busy', t('events.noEvents'));
        }
    }

    // Past events
    const pastContainer = document.getElementById('home-past-events');
    if (pastContainer) {
        const past = events
            .filter(e => !isEventUpcoming(e, now))
            .sort((a, b) => getEventSortTimestamp(b, now) - getEventSortTimestamp(a, now))
            .slice(0, 4);

        if (past.length > 0) {
            pastContainer.innerHTML = past.map(e => renderPastEventRow(e)).join('');
        }
    }

    // Initialize countdown
    if (typeof initCountdownFromEvents === 'function') {
        initCountdownFromEvents();
    }
}
