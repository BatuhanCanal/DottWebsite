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
    const date = new Date(dateStr);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', options);
}

/**
 * Format short date (e.g., "Mar 15")
 */
function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', options);
}

/**
 * Format day of week
 */
function formatDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long' });
}

/**
 * Render a featured event card (large, horizontal)
 */
function renderFeaturedCard(event) {
    const safeImage = escapeHTML(event.image) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80';
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeDesc = escapeHTML(getEventDesc(event));
    const safeTime = escapeHTML(event.time);
    const safeLocation = escapeHTML(event.location);
    const safeLink = escapeHTML(event.link);

    return `
    <div class="group relative overflow-hidden rounded-xl bg-card-dark border border-border-dark hover:border-primary/50 transition-all shadow-md hover:shadow-xl hover:shadow-primary/5 card-hover">
        <div class="flex flex-col sm:flex-row h-full">
            <div class="h-48 sm:h-auto sm:w-2/5 relative">
                <div class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style="background-image: url('${safeImage}');"></div>
                <div class="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-card-dark to-transparent opacity-90 sm:opacity-60"></div>
                <div class="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                    ${formatShortDate(event.date)}
                </div>
            </div>
            <div class="p-6 sm:w-3/5 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        ${getCategoryBadge(event.category)}
                        <span class="text-xs text-text-muted flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">schedule</span> ${safeTime || ''}
                        </span>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                        ${safeTitle}</h3>
                    <p class="text-sm text-text-muted line-clamp-2 mb-4">${safeDesc}</p>
                </div>
                <div class="flex items-center justify-between mt-auto">
                    <div class="flex items-center gap-1 text-xs text-text-muted">
                        <span class="material-symbols-outlined text-[16px]">location_on</span>
                        <span>${safeLocation || ''}</span>
                    </div>
                    ${safeLink ? `<a href="${safeLink}" target="_blank" class="text-sm font-bold text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded transition-colors border border-primary/20 hover:border-primary">${t('events.details')}</a>` : ''}
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * Render a detailed event card (larger, 2-column layout)
 */
function renderEventCard(event) {
    const safeImage = escapeHTML(event.image) || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80';
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeDesc = escapeHTML(getEventDesc(event));
    const safeTime = escapeHTML(event.time);
    const safeLocation = escapeHTML(event.location);
    const safeLink = escapeHTML(event.link);
    const dayOfWeek = formatDayOfWeek(event.date);

    return `
    <div class="group rounded-2xl bg-card-dark border border-border-dark overflow-hidden hover:border-primary/40 transition-all card-hover shadow-lg hover:shadow-xl hover:shadow-primary/5">
        <!-- Image -->
        <div class="relative h-52 w-full overflow-hidden">
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style="background-image: url('${safeImage}');"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-card-dark/90 via-card-dark/20 to-transparent"></div>
            <!-- Category Badge -->
            <div class="absolute top-3 left-3">
                ${getCategoryBadge(event.category)}
            </div>
            <!-- Date Badge -->
            <div class="absolute top-3 right-3 bg-primary text-background-dark font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg">
                ${formatShortDate(event.date)}
            </div>
            <!-- Title overlay on image bottom -->
            <div class="absolute bottom-0 left-0 right-0 p-5">
                <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors drop-shadow-lg leading-tight">
                    ${safeTitle}
                </h3>
            </div>
        </div>
        <!-- Content -->
        <div class="p-5 space-y-4">
            <!-- Date/Time/Location info row -->
            <div class="flex flex-wrap gap-2 sm:gap-3">
                <div class="flex items-center gap-1.5 text-xs sm:text-sm text-text-muted bg-background-dark/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                    <span class="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">calendar_today</span>
                    <span>${formatDate(event.date)}</span>
                </div>
                ${safeTime ? `
                <div class="flex items-center gap-1.5 text-xs sm:text-sm text-text-muted bg-background-dark/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                    <span class="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">schedule</span>
                    <span>${safeTime}</span>
                </div>` : ''}
                ${safeLocation ? `
                <div class="flex items-center gap-1.5 text-xs sm:text-sm text-text-muted bg-background-dark/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                    <span class="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">${event.location?.toLowerCase() === 'online' || event.location?.toLowerCase() === 'çevrimiçi' ? 'videocam' : 'location_on'}</span>
                    <span>${safeLocation}</span>
                </div>` : ''}
            </div>
            <!-- Description -->
            <p class="text-sm text-text-muted line-clamp-3 leading-relaxed">${safeDesc}</p>
            <!-- Day + Link row -->
            <div class="flex items-center justify-between pt-3 border-t border-border-dark/50">
                <span class="text-xs text-text-muted/70 capitalize">${dayOfWeek}</span>
                ${safeLink ? `<a href="${safeLink}" target="_blank" class="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-primary/10 hover:bg-primary px-4 py-2 rounded-lg transition-colors border border-primary/20 hover:border-primary">
                    <span>${t('events.details')}</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>` : ''}
            </div>
        </div>
    </div>`;
}

/**
 * Render a past event row
 */
function renderPastEventRow(event) {
    const date = new Date(event.date);
    const monthYear = date.toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', year: 'numeric' }).toUpperCase();
    const safeTitle = escapeHTML(getEventTitle(event));
    const safeLocation = escapeHTML(event.location);
    const safeLink = escapeHTML(event.link);

    return `
    <div class="block bg-card-dark/30 hover:bg-card-dark border border-transparent hover:border-border-dark rounded-lg p-3 sm:p-4 transition-colors">
        <div class="flex items-start sm:items-center justify-between gap-2">
            <div class="flex items-start sm:items-center gap-2 sm:gap-4 flex-wrap min-w-0 flex-1">
                <div class="bg-gray-800 text-gray-400 font-mono text-[10px] sm:text-xs px-2 py-1 rounded flex-shrink-0">${monthYear}</div>
                <span class="text-white font-medium text-sm sm:text-base">${safeTitle}</span>
                ${getCategoryBadge(event.category)}
                ${safeLocation ? `<span class="text-xs text-text-muted flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${safeLocation}</span>` : ''}
            </div>
            ${safeLink ? `<a href="${safeLink}" target="_blank" class="flex-shrink-0"><span class="material-symbols-outlined text-text-muted text-sm hover:text-primary transition-colors">chevron_right</span></a>` : ''}
        </div>
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
        class="filter-btn whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-background-dark"
        data-i18n="events.filter.all">${t('events.filter.all')}</button>`;

    categories.forEach(cat => {
        const label = currentLang === 'tr' ? (cat.name_tr || cat.name_en) : (cat.name_en || cat.name_tr);
        html += `<button onclick="filterEvents('${escapeHTML(cat.id)}')" data-filter="${escapeHTML(cat.id)}"
            class="filter-btn whitespace-nowrap rounded-full border border-border-dark bg-transparent px-4 py-1.5 text-sm font-medium text-text-muted hover:border-primary hover:text-white transition-colors">${escapeHTML(label)}</button>`;
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

    let upcoming = events.filter(e => new Date(e.date).getTime() >= now && e.category !== 'gamejam');
    let past = events.filter(e => new Date(e.date).getTime() < now && e.category !== 'gamejam');

    if (filter !== 'all') {
        upcoming = upcoming.filter(e => e.category === filter);
        past = past.filter(e => e.category === filter);
    }

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (upcoming.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-16 text-text-muted"><span class="material-symbols-outlined text-4xl mb-4 block">event_busy</span><p data-i18n="events.noEvents">${t('events.noEvents')}</p></div>`;
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
        .filter(e => e.category === 'gamejam' && new Date(e.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const pastJams = events
        .filter(e => e.category === 'gamejam' && new Date(e.date).getTime() < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (upcomingJams.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-16 text-text-muted"><span class="material-symbols-outlined text-4xl mb-4 block">sports_esports</span><p data-i18n="gamejams.noJams">${t('gamejams.noJams')}</p></div>`;
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
            .filter(e => e.category === 'workshop' && new Date(e.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 2);

        if (workshops.length > 0) {
            workshopsContainer.innerHTML = workshops.map(e => renderFeaturedCard(e)).join('');
        } else {
            workshopsContainer.innerHTML = `<div class="col-span-full text-center py-8 text-text-muted">${t('events.noEvents')}</div>`;
        }
    }

    // Upcoming events (next 3)
    const eventsContainer = document.getElementById('home-events');
    if (eventsContainer) {
        const upcoming = events
            .filter(e => new Date(e.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3);

        if (upcoming.length > 0) {
            eventsContainer.innerHTML = upcoming.map(e => renderEventCard(e)).join('');
        } else {
            eventsContainer.innerHTML = `<div class="col-span-full text-center py-8 text-text-muted">${t('events.noEvents')}</div>`;
        }
    }

    // Past events
    const pastContainer = document.getElementById('home-past-events');
    if (pastContainer) {
        const past = events
            .filter(e => new Date(e.date).getTime() < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
