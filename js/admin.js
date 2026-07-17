/* ========================================
   Gazi DOTT — Admin Panel Logic v3
   Static mode auth + local data CRUD + client-side image upload
   ========================================
   Works on static hosting (GitHub Pages / Netlify).
   Data changes are stored in browser localStorage.
   ======================================== */

const ADMIN_SESSION_KEY = 'dott-admin-session';
const ADMIN_PASSWORD_HASH_KEY = 'dott-admin-password-hash';
const ADMIN_DIRTY_KEY = 'dott-admin-unsynced-changes';
const EVENT_IMAGE_DELETION_KEY = 'dott-pending-event-image-deletions';
const EVENT_IMAGE_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const EVENT_IMAGE_TARGET_BYTES = 700 * 1024;

// Currently editing event/member/category
let editingEventId = null;
let editingMemberId = null;
let editingCategoryId = null;
// Current selected image URL/data URI
let currentEventImage = '';
let currentMemberPhoto = '';
let isEventImageProcessing = false;
// Current selected color for category
let currentCategoryColor = 'blue';

/* ========================================
   Authentication (Client-Side)
   ======================================== */

/**
 * Hash text with SHA-256 for password comparison.
 */
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if admin session is active.
 */
async function isAdminAuthenticated() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

/**
 * Login with stored password hash.
 * First successful login initializes the password for this browser.
 */
async function adminLogin(password) {
    const value = String(password || '').trim();
    if (!value) return false;

    try {
        const providedHash = await sha256(value);
        const storedHash = localStorage.getItem(ADMIN_PASSWORD_HASH_KEY);

        if (!storedHash) {
            localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, providedHash);
            sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
            return true;
        }

        if (storedHash === providedHash) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Logout from client-side session
 */
async function adminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.reload();
}

function generateClientId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function hasUnsyncedChanges() {
    return localStorage.getItem(ADMIN_DIRTY_KEY) === '1';
}

function markUnsyncedChanges() {
    localStorage.setItem(ADMIN_DIRTY_KEY, '1');
    updatePublishStatus();
}

function clearUnsyncedChanges() {
    localStorage.removeItem(ADMIN_DIRTY_KEY);
    updatePublishStatus();
}

function updatePublishStatus() {
    const status = document.getElementById('admin-publish-status');
    if (!status) return;

    const pending = hasUnsyncedChanges();
    const icon = status.querySelector('.material-symbols-outlined');
    const label = status.querySelector('[data-i18n]');
    const key = pending ? 'admin.changesPending' : 'admin.allChangesPublished';
    if (icon) icon.textContent = pending ? 'cloud_upload' : 'cloud_done';
    if (label) {
        label.dataset.i18n = key;
        label.textContent = t(key);
    }
    status.classList.toggle('text-primary', pending);
    status.classList.toggle('text-text-muted', !pending);
}

function isManagedEventImagePath(path) {
    return typeof path === 'string' && /^assets\/events\/[a-zA-Z0-9._/-]+$/.test(path);
}

function queueEventImageDeletion(path) {
    if (!isManagedEventImagePath(path)) return;
    let queued = [];
    try {
        queued = JSON.parse(localStorage.getItem(EVENT_IMAGE_DELETION_KEY) || '[]');
    } catch {
        queued = [];
    }
    if (!queued.includes(path)) {
        queued.push(path);
        localStorage.setItem(EVENT_IMAGE_DELETION_KEY, JSON.stringify(queued));
    }
}

/* ========================================
   Event CRUD (local storage)
   ======================================== */

async function addEvent(eventData) {
    const events = (await getEvents()).slice();
    const created = {
        ...eventData,
        id: generateClientId('evt'),
        createdAt: new Date().toISOString()
    };
    events.push(created);
    setEventsData(events);
    markUnsyncedChanges();
    return created;
}

async function updateEvent(id, data) {
    const events = (await getEvents()).slice();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Event not found');

    const previousImage = events[idx].image || '';
    events[idx] = {
        ...events[idx],
        ...data,
        id,
        updatedAt: new Date().toISOString()
    };
    if (previousImage !== events[idx].image) queueEventImageDeletion(previousImage);
    setEventsData(events);
    markUnsyncedChanges();
}

async function deleteEvent(id) {
    const events = await getEvents();
    const filtered = events.filter(e => e.id !== id);
    if (filtered.length === events.length) throw new Error('Event not found');
    queueEventImageDeletion(events.find(e => e.id === id)?.image);
    setEventsData(filtered);
    markUnsyncedChanges();
}

async function deletePastEvents() {
    const now = Date.now();
    const events = await getEvents();
    const filtered = events.filter(e => isEventUpcoming(e, now));
    events.filter(e => !isEventUpcoming(e, now)).forEach(e => queueEventImageDeletion(e.image));
    setEventsData(filtered);
    markUnsyncedChanges();
}

/* ========================================
   Category CRUD (local storage)
   ======================================== */

async function addCategory(data) {
    const categories = (await getCategories()).slice();
    const baseName = (data.name_en || data.name_tr || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const id = baseName || generateClientId('cat');
    if (categories.some(c => c.id === id)) {
        throw new Error('Category with this name already exists');
    }

    const created = {
        id,
        name_tr: data.name_tr || '',
        name_en: data.name_en || '',
        icon: data.icon || 'category',
        color: data.color || 'gray'
    };
    categories.push(created);
    setCategoriesData(categories);
    markUnsyncedChanges();
    return created;
}

async function updateCategory(id, data) {
    const categories = (await getCategories()).slice();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Category not found');

    categories[idx] = {
        ...categories[idx],
        ...data,
        id
    };
    setCategoriesData(categories);
    markUnsyncedChanges();
}

async function deleteCategory(id) {
    const categories = await getCategories();
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length === categories.length) throw new Error('Category not found');
    setCategoriesData(filtered);
    markUnsyncedChanges();
}

/* ========================================
   Image Upload Handling (Client-side)
   ======================================== */

/**
 * Convert a file to a data URI for static hosting.
 */
async function uploadImageFile(file) {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Upload failed'));
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setEventImageStatus(message = '', state = 'info') {
    const status = document.getElementById('event-image-status');
    const icon = document.getElementById('event-image-status-icon');
    const text = document.getElementById('event-image-status-text');
    if (!status || !text || !icon) return;

    status.classList.toggle('hidden', !message);
    status.classList.toggle('flex', Boolean(message));
    status.classList.remove('text-text-muted', 'text-primary', 'text-green-400', 'text-red-400');
    const states = {
        processing: ['progress_activity', 'text-primary'],
        ready: ['check_circle', 'text-green-400'],
        pending: ['cloud_upload', 'text-primary'],
        error: ['error', 'text-red-400'],
        info: ['info', 'text-text-muted']
    };
    const [iconName, colorClass] = states[state] || states.info;
    icon.textContent = iconName;
    icon.classList.toggle('animate-spin', state === 'processing');
    status.classList.add(colorClass);
    text.textContent = message;
}

function showEventImagePreview(src) {
    const preview = document.getElementById('event-image-preview');
    const wrap = document.getElementById('event-image-preview-wrap');
    if (!preview || !wrap || !src) return;
    preview.src = src;
    wrap.classList.remove('hidden');
}

function hideEventImagePreview() {
    const preview = document.getElementById('event-image-preview');
    const wrap = document.getElementById('event-image-preview-wrap');
    if (preview) preview.removeAttribute('src');
    if (wrap) wrap.classList.add('hidden');
}

function clearEventImage() {
    currentEventImage = '';
    const fileInput = document.getElementById('event-image-file');
    const urlInput = document.getElementById('event-image-url');
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    hideEventImagePreview();
    setEventImageStatus();
}

async function loadImageSource(file) {
    if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(file);
        return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close()
        };
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    try {
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = objectUrl;
        });
        return {
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            cleanup: () => URL.revokeObjectURL(objectUrl)
        };
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
    }
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image encoding failed')), type, quality);
    });
}

async function optimizeEventImage(file) {
    const loaded = await loadImageSource(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
        loaded.cleanup();
        throw new Error('Canvas is not supported');
    }

    let scale = Math.min(1, 1600 / loaded.width, 1200 / loaded.height);
    let output = null;
    try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            canvas.width = Math.max(1, Math.round(loaded.width * scale));
            canvas.height = Math.max(1, Math.round(loaded.height * scale));
            context.fillStyle = '#111111';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(loaded.source, 0, 0, canvas.width, canvas.height);
            output = await canvasToBlob(canvas, 'image/webp', Math.max(0.62, 0.84 - (attempt * 0.06)));
            if (output.size <= EVENT_IMAGE_TARGET_BYTES || canvas.width <= 960) break;
            scale *= 0.82;
        }
    } finally {
        loaded.cleanup();
    }

    if (!output) throw new Error('Image encoding failed');
    return output;
}

async function handleEventImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file || !allowedTypes.includes(file.type)) {
        showToast(t('admin.imageUnsupported'), 'error');
        return;
    }
    if (file.size > EVENT_IMAGE_MAX_SOURCE_BYTES) {
        showToast(t('admin.imageTooLarge'), 'error');
        return;
    }

    isEventImageProcessing = true;
    setEventImageStatus(t('admin.eventImageProcessing'), 'processing');
    try {
        const optimized = await optimizeEventImage(file);
        const dataUrl = await uploadImageFile(optimized);
        currentEventImage = dataUrl;
        const urlInput = document.getElementById('event-image-url');
        if (urlInput) urlInput.value = '';
        showEventImagePreview(dataUrl);
        const message = t('admin.eventImageReady')
            .replace('{before}', formatFileSize(file.size))
            .replace('{after}', formatFileSize(optimized.size));
        setEventImageStatus(message, 'ready');
    } catch (error) {
        console.error(error);
        clearEventImage();
        showToast(t('admin.imageOptimizeFailed'), 'error');
    } finally {
        isEventImageProcessing = false;
    }
}

function setupEventImageUpload() {
    const dropZone = document.getElementById('event-image-drop');
    const fileInput = document.getElementById('event-image-file');
    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.add('border-primary', 'bg-primary/5');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, event => {
            event.preventDefault();
            dropZone.classList.remove('border-primary', 'bg-primary/5');
        });
    });
    dropZone.addEventListener('drop', event => {
        const file = event.dataTransfer?.files?.[0];
        if (file) handleEventImageFile(file);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (file) handleEventImageFile(file);
    });
}

/**
 * Setup drag-and-drop image upload zone
 */
function setupImageUpload(dropZoneId, previewId, onImageSet) {
    const dropZone = document.getElementById(dropZoneId);
    const preview = document.getElementById(previewId);
    if (!dropZone) return;

    // Drag events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('border-primary', 'bg-primary/5');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('border-primary', 'bg-primary/5');
        });
    });

    // Drop
    dropZone.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            await handleImageFile(files[0], preview, onImageSet);
        }
    });

    // Click to select
    dropZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await handleImageFile(e.target.files[0], preview, onImageSet);
            }
        };
        input.click();
    });
}

/**
 * Handle an image file and show preview
 */
async function handleImageFile(file, previewEl, onImageSet) {
    // Reject oversized files (2MB max in static mode)
    if (file.size > 2 * 1024 * 1024) {
        showToast(t('admin.imageSizeWarning'), 'error');
        return;
    }

    try {
        // Show uploading state
        if (previewEl) {
            previewEl.classList.remove('hidden');
            previewEl.style.opacity = '0.5';
        }

        // Convert to storable data URI
        const url = await uploadImageFile(file);

        if (previewEl) {
            previewEl.src = url;
            previewEl.style.opacity = '1';
        }
        if (onImageSet) onImageSet(url);
    } catch (err) {
        showToast(err.message || 'Image upload failed', 'error');
        if (previewEl) {
            previewEl.classList.add('hidden');
            previewEl.style.opacity = '1';
        }
    }
}

/**
 * Setup URL input that also updates preview
 */
function setupUrlInput(inputId, previewId, onImageSet) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (preview) {
            if (url) {
                preview.src = url;
                if (previewId === 'event-image-preview') {
                    showEventImagePreview(url);
                    setEventImageStatus();
                } else {
                    preview.classList.remove('hidden');
                }
                preview.onerror = () => {
                    if (previewId === 'event-image-preview') hideEventImagePreview();
                    else preview.classList.add('hidden');
                };
            } else {
                if (previewId === 'event-image-preview') hideEventImagePreview();
                else preview.classList.add('hidden');
            }
        }
        if (onImageSet) onImageSet(url);
    });
}

/* ========================================
   Admin Tab Navigation
   ======================================== */

function switchAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('bg-primary', 'text-background-dark');
            btn.classList.remove('bg-card-dark', 'text-text-muted', 'border-border-dark');
        } else {
            btn.classList.remove('bg-primary', 'text-background-dark');
            btn.classList.add('bg-card-dark', 'text-text-muted', 'border-border-dark');
        }
    });

    // Show/hide tab panels
    document.querySelectorAll('.admin-tab-panel').forEach(panel => {
        if (panel.dataset.tab === tabName) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });
}

/* ========================================
   Render Admin Events List
   ======================================== */

async function renderAdminEvents() {
    const container = document.getElementById('admin-events-list');
    if (!container) return;

    const events = await getEvents();
    const now = new Date().getTime();

    if (events.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-text-muted">
                <span class="material-symbols-outlined text-5xl mb-3 block opacity-50">event_busy</span>
                <p class="text-lg" data-i18n="admin.noEvents">${t('admin.noEvents')}</p>
            </div>`;
        return;
    }

    // Separate upcoming and past
    const upcoming = events.filter(e => isEventUpcoming(e, now))
        .sort((a, b) => getEventSortTimestamp(a, now) - getEventSortTimestamp(b, now));
    const past = events.filter(e => !isEventUpcoming(e, now))
        .sort((a, b) => getEventSortTimestamp(b, now) - getEventSortTimestamp(a, now));

    let html = '';

    // Upcoming section
    if (upcoming.length > 0) {
        html += `<div class="mb-6">
            <h3 class="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">upcoming</span>
                <span data-i18n="admin.upcomingEvents">${t('admin.upcomingEvents')}</span>
                <span class="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">${upcoming.length}</span>
            </h3>
            <div class="space-y-3">${upcoming.map(e => renderAdminEventCard(e, true)).join('')}</div>
        </div>`;
    }

    // Past section
    if (past.length > 0) {
        html += `<div>
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px]">history</span>
                    <span data-i18n="admin.pastEvents">${t('admin.pastEvents')}</span>
                    <span class="bg-border-dark text-text-muted text-xs px-2 py-0.5 rounded-full">${past.length}</span>
                </h3>
                <button onclick="handleDeletePastEvents()"
                    class="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                    <span class="material-symbols-outlined text-[14px]">delete_sweep</span>
                    <span data-i18n="admin.deletePastEvents">${t('admin.deletePastEvents')}</span>
                </button>
            </div>
            <div class="space-y-3">${past.map(e => renderAdminEventCard(e, false)).join('')}</div>
        </div>`;
    }

    container.innerHTML = html;
}

/**
 * Render a single admin event card
 */
function renderAdminEventCard(event, isUpcoming) {
    const statusDot = isUpcoming
        ? '<span class="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>'
        : '<span class="h-2 w-2 rounded-full bg-gray-500 flex-shrink-0"></span>';

    const safeTitle = escapeHTML(event.title_tr || event.title_en);
    const safeImage = escapeHTML(event.image);
    const safeLocation = escapeHTML(event.location);
    const safeId = escapeHTML(event.id);
    const sessions = getEventSessions(event);
    const displaySession = getEventDisplaySession(event);
    const sessionLabel = displaySession
        ? `${formatDate(displaySession.date)}${displaySession.time ? ` · ${escapeHTML(displaySession.time)}` : ''}`
        : '';
    const imagePending = typeof event.image === 'string' && event.image.startsWith('data:image/');

    return `
    <div class="bg-card-dark border border-border-dark rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${!isUpcoming ? 'opacity-60' : ''} hover:border-border-dark/80 transition-all">
        <div class="flex items-start gap-3 flex-1 min-w-0">
            ${event.image
            ? `<img src="${safeImage}" alt="" class="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border-dark" onerror="this.style.display='none'" />`
            : `<div class="w-14 h-14 rounded-lg bg-border-dark/50 flex-shrink-0 flex items-center justify-center"><span class="material-symbols-outlined text-text-muted text-[20px]">image</span></div>`
        }
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                    ${statusDot}
                    <h4 class="font-bold text-white truncate text-sm">${safeTitle}</h4>
                </div>
                <p class="text-xs text-text-muted">${sessionLabel}${sessions.length > 1 ? ` · ${sessions.length} ${escapeHTML(t('events.session'))}` : ''}</p>
                <div class="flex items-center gap-2 mt-1">
                    ${getCategoryBadge(event.category)}
                    ${safeLocation ? `<span class="text-xs text-text-muted">${safeLocation}</span>` : ''}
                </div>
                ${imagePending ? `<p class="mt-1 flex items-center gap-1 text-[11px] text-primary"><span class="material-symbols-outlined text-[14px]">cloud_upload</span>${escapeHTML(t('admin.pendingImageUpload'))}</p>` : ''}
            </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
            <button onclick="handleEditEvent('${safeId}')"
                class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                title="${t('admin.edit')}">
                <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="handleDeleteEvent('${safeId}')"
                class="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                title="${t('admin.delete')}">
                <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
        </div>
    </div>`;
}

/* ========================================
   Render Admin Team List
   ======================================== */

async function renderAdminTeam() {
    const container = document.getElementById('admin-team-list');
    if (!container) return;

    const members = await getTeamMembers();
    members.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (members.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-text-muted">
                <span class="material-symbols-outlined text-5xl mb-3 block opacity-50">group_off</span>
                <p class="text-lg" data-i18n="admin.noMembers">${t('admin.noMembers')}</p>
            </div>`;
        return;
    }

    container.innerHTML = members.map((member, idx) => {
        const safeName = escapeHTML(member.name);
        const safePhoto = escapeHTML(member.photo);
        const safeRole = escapeHTML(getMemberRole(member));
        const safeId = escapeHTML(member.id);

        return `
        <div class="bg-card-dark border border-border-dark rounded-xl p-4 hover:border-border-dark/80 transition-all">
            <div class="flex items-center gap-4">
            ${member.photo
                ? `<img src="${safePhoto}" alt="" class="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-border-dark" onerror="this.style.display='none'" />`
                : `<div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20"><span class="material-symbols-outlined text-primary text-[20px]">person</span></div>`
            }
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-white truncate text-sm">${safeName}</h4>
                <p class="text-xs text-primary">${safeRole}</p>
            </div>
            <div class="hidden sm:flex items-center gap-1 flex-shrink-0">
                <button onclick="handleMoveTeamMember('${safeId}', 'up')"
                    class="p-1.5 rounded-lg hover:bg-card-dark text-text-muted hover:text-white transition-colors ${idx === 0 ? 'opacity-30 pointer-events-none' : ''}"
                    title="Move up">
                    <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
                </button>
                <button onclick="handleMoveTeamMember('${safeId}', 'down')"
                    class="p-1.5 rounded-lg hover:bg-card-dark text-text-muted hover:text-white transition-colors ${idx === members.length - 1 ? 'opacity-30 pointer-events-none' : ''}"
                    title="Move down">
                    <span class="material-symbols-outlined text-[16px]">arrow_downward</span>
                </button>
                <button onclick="handleEditMember('${safeId}')"
                    class="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    title="${t('admin.edit')}">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button onclick="handleDeleteMember('${safeId}')"
                    class="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    title="${t('admin.delete')}">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>
            </div>
            <!-- Mobile action buttons row -->
            <div class="flex sm:hidden items-center gap-1 mt-3 pt-3 border-t border-border-dark/50 justify-end">
                <button onclick="handleMoveTeamMember('${safeId}', 'up')"
                    class="p-2 rounded-lg hover:bg-card-dark text-text-muted hover:text-white transition-colors ${idx === 0 ? 'opacity-30 pointer-events-none' : ''}"
                    title="Move up">
                    <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button onclick="handleMoveTeamMember('${safeId}', 'down')"
                    class="p-2 rounded-lg hover:bg-card-dark text-text-muted hover:text-white transition-colors ${idx === members.length - 1 ? 'opacity-30 pointer-events-none' : ''}"
                    title="Move down">
                    <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button onclick="handleEditMember('${safeId}')"
                    class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    title="${t('admin.edit')}">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="handleDeleteMember('${safeId}')"
                    class="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    title="${t('admin.delete')}">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

/* ========================================
   Dynamic Event Sessions & Links
   ======================================== */

const adminFieldClass = 'block w-full rounded-lg border border-border-dark bg-background-dark px-3 py-2.5 text-sm text-white placeholder:text-text-muted/50 focus:border-primary focus:ring-1 focus:ring-primary';

function refreshEventSessionRows() {
    const rows = Array.from(document.querySelectorAll('#event-sessions-list [data-session-row]'));
    rows.forEach((row, index) => {
        const number = row.querySelector('[data-session-number]');
        const removeButton = row.querySelector('[data-remove-session]');
        if (number) number.textContent = String(index + 1).padStart(2, '0');
        if (removeButton) {
            removeButton.disabled = rows.length === 1;
            removeButton.classList.toggle('opacity-30', rows.length === 1);
            removeButton.classList.toggle('pointer-events-none', rows.length === 1);
        }
    });
}

function addEventSessionRow(session = {}) {
    const container = document.getElementById('event-sessions-list');
    if (!container) return;

    const row = document.createElement('div');
    row.dataset.sessionRow = '';
    row.className = 'rounded-lg border border-border-dark bg-background-dark/40 p-3';
    row.innerHTML = `
        <div class="mb-3 flex items-center justify-between gap-3">
            <span class="font-mono text-xs font-bold text-primary" data-session-number></span>
            <button type="button" data-remove-session onclick="removeEventSessionRow(this)"
                class="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                title="${escapeHTML(t('admin.removeDate'))}" aria-label="${escapeHTML(t('admin.removeDate'))}">
                <span class="material-symbols-outlined text-[17px]">delete</span>
            </button>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.sessionLabelTr">${t('admin.sessionLabelTr')}</label>
                <input type="text" data-session-label-tr class="${adminFieldClass}" value="${escapeHTML(session.label_tr || '')}" placeholder="Ör: 1. Ders" />
            </div>
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.sessionLabelEn">${t('admin.sessionLabelEn')}</label>
                <input type="text" data-session-label-en class="${adminFieldClass}" value="${escapeHTML(session.label_en || '')}" placeholder="E.g. Lesson 1" />
            </div>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.eventDate">${t('admin.eventDate')}</label>
                <input type="date" data-session-date class="${adminFieldClass}" value="${escapeHTML(session.date || '')}" required />
            </div>
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.eventTime">${t('admin.eventTime')}</label>
                <input type="time" data-session-time class="${adminFieldClass}" value="${escapeHTML(session.time || '')}" />
            </div>
        </div>`;
    container.appendChild(row);
    refreshEventSessionRows();
}

function removeEventSessionRow(button) {
    const container = document.getElementById('event-sessions-list');
    if (!container || container.children.length <= 1) return;
    button.closest('[data-session-row]')?.remove();
    refreshEventSessionRows();
}

function setEventSessionsForm(sessions) {
    const container = document.getElementById('event-sessions-list');
    if (!container) return;
    container.innerHTML = '';
    const normalized = Array.isArray(sessions) && sessions.length > 0 ? sessions : [{}];
    normalized.forEach(session => addEventSessionRow(session));
}

function collectEventSessions() {
    return Array.from(document.querySelectorAll('#event-sessions-list [data-session-row]'))
        .map(row => ({
            label_tr: row.querySelector('[data-session-label-tr]').value.trim(),
            label_en: row.querySelector('[data-session-label-en]').value.trim(),
            date: row.querySelector('[data-session-date]').value,
            time: row.querySelector('[data-session-time]').value,
        }))
        .sort((a, b) => getSessionTimestamp(a) - getSessionTimestamp(b));
}

function addEventLinkRow(link = {}) {
    const container = document.getElementById('event-links-list');
    if (!container) return;

    const row = document.createElement('div');
    row.dataset.eventLinkRow = '';
    row.className = 'rounded-lg border border-border-dark bg-background-dark/40 p-3';
    row.innerHTML = `
        <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.linkLabelTr">${t('admin.linkLabelTr')}</label>
                <input type="text" data-link-label-tr class="${adminFieldClass}" value="${escapeHTML(link.label_tr || '')}" placeholder="Ör: Fotoğraflar" />
            </div>
            <div>
                <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.linkLabelEn">${t('admin.linkLabelEn')}</label>
                <input type="text" data-link-label-en class="${adminFieldClass}" value="${escapeHTML(link.label_en || '')}" placeholder="E.g. Photos" />
            </div>
            <button type="button" onclick="removeEventLinkRow(this)"
                class="ml-auto grid h-[42px] w-[42px] place-items-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                title="${escapeHTML(t('admin.removeLink'))}" aria-label="${escapeHTML(t('admin.removeLink'))}">
                <span class="material-symbols-outlined text-[17px]">delete</span>
            </button>
        </div>
        <div class="mt-2">
            <label class="mb-1 block text-[11px] text-text-muted" data-i18n="admin.linkUrl">${t('admin.linkUrl')}</label>
            <input type="url" data-link-url class="${adminFieldClass}" value="${escapeHTML(link.url || '')}" placeholder="https://drive.google.com/..." />
        </div>`;
    container.appendChild(row);
}

function removeEventLinkRow(button) {
    button.closest('[data-event-link-row]')?.remove();
}

function setEventLinksForm(links) {
    const container = document.getElementById('event-links-list');
    if (!container) return;
    container.innerHTML = '';
    const normalized = Array.isArray(links) && links.length > 0 ? links : [{}];
    normalized.forEach(link => addEventLinkRow(link));
}

function collectEventLinks() {
    const links = [];
    const rows = Array.from(document.querySelectorAll('#event-links-list [data-event-link-row]'));

    for (const row of rows) {
        const label_tr = row.querySelector('[data-link-label-tr]').value.trim();
        const label_en = row.querySelector('[data-link-label-en]').value.trim();
        const rawUrl = row.querySelector('[data-link-url]').value.trim();
        if (!label_tr && !label_en && !rawUrl) continue;
        if ((!label_tr && !label_en) || !rawUrl) {
            throw new Error(currentLang === 'tr'
                ? 'Her buton için en az bir ad ve bağlantı girin.'
                : 'Enter at least one name and a URL for each button.');
        }
        const url = getSafeExternalUrl(rawUrl);
        if (!url) {
            throw new Error(currentLang === 'tr'
                ? 'Buton bağlantıları http:// veya https:// ile başlamalıdır.'
                : 'Button links must start with http:// or https://.');
        }
        links.push({ label_tr, label_en, url });
    }
    return links;
}

function resetEventDynamicFields() {
    setEventSessionsForm([{}]);
    setEventLinksForm([{}]);
}

/* ========================================
   Event Handlers
   ======================================== */

async function handleEditEvent(id) {
    const events = await getEvents();
    const event = events.find(e => e.id === id);
    if (!event) return;

    editingEventId = id;
    const form = document.getElementById('event-form');
    if (!form) return;

    // Populate form
    form.title_tr.value = event.title_tr || '';
    form.title_en.value = event.title_en || '';
    form.description_tr.value = event.description_tr || '';
    form.description_en.value = event.description_en || '';
    form.category.value = event.category || 'workshop';
    form.location.value = event.location || '';
    form.image_url.value = /^https?:\/\//i.test(event.image || '') ? event.image : '';
    setEventSessionsForm(getEventSessions(event));
    setEventLinksForm(getEventLinks(event));

    // Set image
    currentEventImage = event.image || '';
    if (currentEventImage) {
        showEventImagePreview(currentEventImage);
        if (currentEventImage.startsWith('data:image/')) {
            setEventImageStatus(t('admin.eventImagePending'), 'pending');
        } else if (isManagedEventImagePath(currentEventImage)) {
            setEventImageStatus(t('admin.eventImagePublished'), 'ready');
        } else {
            setEventImageStatus();
        }
    }

    // Update form title and buttons
    const formTitle = document.getElementById('event-form-title');
    const submitBtn = document.getElementById('event-submit-btn');
    const cancelBtn = document.getElementById('event-cancel-btn');
    if (formTitle) formTitle.setAttribute('data-i18n', 'admin.editEvent');
    if (formTitle) formTitle.textContent = t('admin.editEvent');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.update');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    // Update category visual selector
    updateCategorySelector(event.category);

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCancelEventEdit() {
    editingEventId = null;
    const form = document.getElementById('event-form');
    if (form) form.reset();
    resetEventDynamicFields();
    clearEventImage();

    const formTitle = document.getElementById('event-form-title');
    const submitBtn = document.getElementById('event-submit-btn');
    const cancelBtn = document.getElementById('event-cancel-btn');
    if (formTitle) formTitle.setAttribute('data-i18n', 'admin.createEvent');
    if (formTitle) formTitle.textContent = t('admin.createEvent');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.save');
    if (cancelBtn) cancelBtn.classList.add('hidden');

    updateCategorySelector('workshop');
}

async function handleDeleteEvent(id) {
    if (confirm(currentLang === 'tr' ? 'Bu etkinliği silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this event?')) {
        await deleteEvent(id);
        await renderAdminEvents();
        showToast(t('admin.eventDeleted'), 'success');
        if (editingEventId === id) handleCancelEventEdit();
    }
}

async function handleDeletePastEvents() {
    if (confirm(currentLang === 'tr' ? 'Tüm geçmiş etkinlikleri silmek istediğinize emin misiniz?' : 'Are you sure you want to delete all past events?')) {
        await deletePastEvents();
        await renderAdminEvents();
        showToast(t('admin.eventDeleted'), 'success');
    }
}

async function handleEventFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    if (isEventImageProcessing) {
        showToast(t('admin.imageStillProcessing'), 'info');
        return;
    }

    let sessions;
    let links;
    try {
        sessions = collectEventSessions();
        links = collectEventLinks();
    } catch (err) {
        showToast(err.message, 'error');
        return;
    }

    const eventData = {
        title_tr: form.title_tr.value.trim(),
        title_en: form.title_en.value.trim(),
        description_tr: form.description_tr.value.trim(),
        description_en: form.description_en.value.trim(),
        sessions,
        date: sessions[0]?.date || '',
        time: sessions[0]?.time || '',
        category: form.category.value,
        location: form.location.value.trim(),
        image: currentEventImage || form.image_url.value.trim(),
        links,
        link: links[0]?.url || '',
    };

    if (!eventData.title_tr && !eventData.title_en) {
        showToast(currentLang === 'tr' ? 'Lütfen en az bir dilde başlık girin.' : 'Please enter a title in at least one language.', 'error');
        return;
    }
    if (sessions.length === 0 || sessions.some(session => !session.date)) {
        showToast(currentLang === 'tr' ? 'Lütfen tarih seçin.' : 'Please select a date.', 'error');
        return;
    }

    try {
        if (editingEventId) {
            await updateEvent(editingEventId, eventData);
            showToast(t('admin.eventSavedPending'), 'success');
            handleCancelEventEdit();
        } else {
            await addEvent(eventData);
            showToast(t('admin.eventSavedPending'), 'success');
        }

        form.reset();
        resetEventDynamicFields();
        clearEventImage();
        await renderAdminEvents();
    } catch (err) {
        const quotaError = err?.name === 'QuotaExceededError';
        showToast(quotaError
            ? (currentLang === 'tr' ? 'Tarayıcı depolama alanı doldu. Önce bekleyen değişiklikleri siteye yayınlayın.' : 'Browser storage is full. Publish pending changes first.')
            : (currentLang === 'tr' ? 'İşlem başarısız oldu.' : 'Operation failed.'), 'error');
    }
}

/* ========================================
   Team Handlers
   ======================================== */

async function handleEditMember(id) {
    const members = await getTeamMembers();
    const member = members.find(m => m.id === id);
    if (!member) return;

    editingMemberId = id;
    const form = document.getElementById('team-form');
    if (!form) return;

    form.member_name.value = member.name || '';
    form.role_tr.value = member.role_tr || '';
    form.role_en.value = member.role_en || '';

    currentMemberPhoto = member.photo || '';
    const preview = document.getElementById('member-photo-preview');
    if (preview && currentMemberPhoto) {
        preview.src = currentMemberPhoto;
        preview.classList.remove('hidden');
    }

    const formTitle = document.getElementById('team-form-title');
    const submitBtn = document.getElementById('team-submit-btn');
    const cancelBtn = document.getElementById('team-cancel-btn');
    if (formTitle) formTitle.textContent = t('admin.editMember');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.update');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCancelMemberEdit() {
    editingMemberId = null;
    currentMemberPhoto = '';
    const form = document.getElementById('team-form');
    if (form) form.reset();

    const preview = document.getElementById('member-photo-preview');
    if (preview) preview.classList.add('hidden');

    const formTitle = document.getElementById('team-form-title');
    const submitBtn = document.getElementById('team-submit-btn');
    const cancelBtn = document.getElementById('team-cancel-btn');
    if (formTitle) formTitle.textContent = t('admin.addMember');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.save');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function handleDeleteMember(id) {
    if (confirm(currentLang === 'tr' ? 'Bu üyeyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this member?')) {
        await deleteTeamMember(id);
        markUnsyncedChanges();
        await renderAdminTeam();
        showToast(t('admin.memberDeleted'), 'success');
        if (editingMemberId === id) handleCancelMemberEdit();
    }
}

async function handleMoveTeamMember(id, direction) {
    await moveTeamMember(id, direction);
    markUnsyncedChanges();
    await renderAdminTeam();
}

async function handleTeamFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const memberData = {
        name: form.member_name.value.trim(),
        role_tr: form.role_tr.value.trim(),
        role_en: form.role_en.value.trim(),
        photo: currentMemberPhoto,
    };

    if (!memberData.name) {
        showToast(currentLang === 'tr' ? 'Lütfen ad soyad girin.' : 'Please enter a name.', 'error');
        return;
    }

    try {
        if (editingMemberId) {
            await updateTeamMember(editingMemberId, memberData);
            markUnsyncedChanges();
            showToast(t('admin.memberUpdated'), 'success');
            handleCancelMemberEdit();
        } else {
            await addTeamMember(memberData);
            markUnsyncedChanges();
            showToast(t('admin.memberSaved'), 'success');
        }

        form.reset();
        currentMemberPhoto = '';
        const preview = document.getElementById('member-photo-preview');
        if (preview) preview.classList.add('hidden');
        await renderAdminTeam();
    } catch (err) {
        showToast(currentLang === 'tr' ? 'İşlem başarısız oldu.' : 'Operation failed.', 'error');
    }
}

/* ========================================
   Category Visual Selector
   ======================================== */

function updateCategorySelector(category) {
    document.querySelectorAll('.category-card').forEach(card => {
        if (card.dataset.category === category) {
            card.classList.add('border-primary', 'bg-primary/10');
            card.classList.remove('border-border-dark');
        } else {
            card.classList.remove('border-primary', 'bg-primary/10');
            card.classList.add('border-border-dark');
        }
    });
    // Update hidden select
    const select = document.querySelector('select[name="category"]');
    if (select) select.value = category;
}

/**
 * Load category selector cards dynamically from category data
 */
async function loadCategorySelector() {
    const grid = document.getElementById('category-selector-grid');
    const select = document.querySelector('select[name="category"]');
    if (!grid) return;

    const categories = await getCategories();
    if (categories.length === 0) return;

    const iconColorMap = COLOR_CONFIG.iconColor;

    grid.innerHTML = categories.map((cat, idx) => {
        const label = currentLang === 'tr' ? (cat.name_tr || cat.name_en) : (cat.name_en || cat.name_tr);
        const iconClass = iconColorMap[cat.color] || 'text-gray-400';
        const isFirst = idx === 0;
        return `<div data-category="${escapeHTML(cat.id)}"
            class="category-card border ${isFirst ? 'border-primary bg-primary/10' : 'border-border-dark'} rounded-lg p-3 flex items-center gap-2 cursor-pointer transition-all hover:bg-primary/15">
            <span class="material-symbols-outlined ${iconClass} text-[20px]">${escapeHTML(cat.icon || 'category')}</span>
            <span class="text-sm text-white font-medium">${escapeHTML(label)}</span>
        </div>`;
    }).join('');

    // Update hidden select
    if (select) {
        select.innerHTML = categories.map((cat, idx) =>
            `<option value="${escapeHTML(cat.id)}" ${idx === 0 ? 'selected' : ''}>${escapeHTML(cat.name_en || cat.name_tr)}</option>`
        ).join('');
    }

    // Re-attach click listeners
    grid.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            updateCategorySelector(card.dataset.category);
        });
    });
}

/* ========================================
   Render Admin Categories List
   ======================================== */

async function renderAdminCategories() {
    const container = document.getElementById('admin-categories-list');
    if (!container) return;

    const categories = await getCategories();

    if (categories.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-text-muted">
                <span class="material-symbols-outlined text-5xl mb-3 block opacity-50">category</span>
                <p class="text-lg" data-i18n="admin.noCategories">${t('admin.noCategories')}</p>
            </div>`;
        return;
    }

    const iconColorMap = COLOR_CONFIG.iconColor;
    const bgColorMap = COLOR_CONFIG.bgColor;

    container.innerHTML = categories.map(cat => {
        const label = currentLang === 'tr' ? (cat.name_tr || cat.name_en) : (cat.name_en || cat.name_tr);
        const secondLabel = currentLang === 'tr' ? (cat.name_en || '') : (cat.name_tr || '');
        const iconClass = iconColorMap[cat.color] || 'text-gray-400';
        const bgClass = bgColorMap[cat.color] || 'bg-gray-500';
        const safeId = escapeHTML(cat.id);

        return `
        <div class="bg-card-dark border border-border-dark rounded-xl p-4 flex items-center gap-4 hover:border-border-dark/80 transition-all">
            <div class="w-10 h-10 rounded-lg ${bgClass}/20 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined ${iconClass} text-[22px]">${escapeHTML(cat.icon || 'category')}</span>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-white text-sm">${escapeHTML(label)}</h4>
                ${secondLabel ? `<p class="text-xs text-text-muted">${escapeHTML(secondLabel)}</p>` : ''}
                <p class="text-[10px] text-text-muted/60 font-mono mt-0.5">ID: ${safeId}</p>
            </div>
            <div class="w-4 h-4 rounded-full ${bgClass} flex-shrink-0"></div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="handleEditCategory('${safeId}')"
                    class="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    title="${t('admin.edit')}">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="handleDeleteCategory('${safeId}')"
                    class="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    title="${t('admin.delete')}">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

/* ========================================
   Category Handlers
   ======================================== */

async function handleEditCategory(id) {
    const categories = await getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    editingCategoryId = id;
    const form = document.getElementById('category-form');
    if (!form) return;

    form.name_tr.value = cat.name_tr || '';
    form.name_en.value = cat.name_en || '';
    form.icon.value = cat.icon || 'category';
    form.color.value = cat.color || 'blue';
    currentCategoryColor = cat.color || 'blue';

    // Update icon preview
    const iconPreview = document.getElementById('category-icon-preview');
    if (iconPreview) iconPreview.textContent = cat.icon || 'category';

    // Update color picker
    updateColorPicker(cat.color || 'blue');

    const formTitle = document.getElementById('category-form-title');
    const submitBtn = document.getElementById('category-submit-btn');
    const cancelBtn = document.getElementById('category-cancel-btn');
    if (formTitle) formTitle.querySelector('[data-i18n]').textContent = t('admin.editCategory');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.update');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCancelCategoryEdit() {
    editingCategoryId = null;
    currentCategoryColor = 'blue';
    const form = document.getElementById('category-form');
    if (form) form.reset();
    form.icon.value = 'category';
    form.color.value = 'blue';

    const iconPreview = document.getElementById('category-icon-preview');
    if (iconPreview) iconPreview.textContent = 'category';

    updateColorPicker('blue');

    const formTitle = document.getElementById('category-form-title');
    const submitBtn = document.getElementById('category-submit-btn');
    const cancelBtn = document.getElementById('category-cancel-btn');
    if (formTitle) formTitle.querySelector('[data-i18n]').textContent = t('admin.createCategory');
    if (submitBtn) submitBtn.querySelector('[data-i18n]').textContent = t('admin.save');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

async function handleDeleteCategory(id) {
    if (confirm(currentLang === 'tr' ? 'Bu kategoriyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this category?')) {
        try {
            await deleteCategory(id);
            await renderAdminCategories();
            await loadCategorySelector();
            showToast(t('admin.categoryDeleted'), 'success');
            if (editingCategoryId === id) handleCancelCategoryEdit();
        } catch (err) {
            showToast(err.message || 'Delete failed', 'error');
        }
    }
}

async function handleCategoryFormSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const catData = {
        name_tr: form.name_tr.value.trim(),
        name_en: form.name_en.value.trim(),
        icon: form.icon.value.trim() || 'category',
        color: form.color.value || 'blue',
    };

    if (!catData.name_tr && !catData.name_en) {
        showToast(currentLang === 'tr' ? 'Lütfen en az bir dilde kategori adı girin.' : 'Please enter a category name in at least one language.', 'error');
        return;
    }

    try {
        if (editingCategoryId) {
            await updateCategory(editingCategoryId, catData);
            showToast(t('admin.categoryUpdated'), 'success');
            handleCancelCategoryEdit();
        } else {
            await addCategory(catData);
            showToast(t('admin.categorySaved'), 'success');
        }

        form.reset();
        form.icon.value = 'category';
        form.color.value = 'blue';
        currentCategoryColor = 'blue';
        const iconPreview = document.getElementById('category-icon-preview');
        if (iconPreview) iconPreview.textContent = 'category';
        updateColorPicker('blue');
        await renderAdminCategories();
        await loadCategorySelector();
    } catch (err) {
        showToast(err.message || (currentLang === 'tr' ? 'İşlem başarısız oldu.' : 'Operation failed.'), 'error');
    }
}

/**
 * Update color picker visual state
 */
function updateColorPicker(color) {
    document.querySelectorAll('.color-btn').forEach(btn => {
        if (btn.dataset.color === color) {
            btn.className = `color-btn w-8 h-8 rounded-full bg-${color}-500 border-2 border-${color}-500 ring-2 ring-offset-2 ring-offset-card-dark ring-${color}-500`;
        } else {
            btn.className = `color-btn w-8 h-8 rounded-full bg-${btn.dataset.color}-500 border-2 border-transparent`;
        }
    });
}

/* ========================================
   GitHub Synchronization (Option 1)
   ======================================== */

const GITHUB_REPO = 'BatuhanCanal/DottWebsite';
const GITHUB_BRANCH = 'static';
const GITHUB_TOKEN_KEY = 'dott_github_token'; // Used for cookie

// --- Cookie Helpers ---
function setCookie(name, value, days = 365) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) == 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
// ----------------------

// --- Sync Lock & Button State Helpers ---
let _syncInProgress = false;

function setSyncButtonsLoading(loading) {
    const syncBtn = document.querySelector('[onclick="handleGitHubSync()"]');
    const pullBtn = document.querySelector('[onclick="handleGitHubPull()"]');
    [syncBtn, pullBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = loading;
        btn.style.opacity = loading ? '0.5' : '1';
        btn.style.pointerEvents = loading ? 'none' : 'auto';
    });
}

async function handleGitHubSync() {
    const token = getCookie(GITHUB_TOKEN_KEY);
    if (!token) {
        showToast(currentLang === 'tr' ? 'Lütfen Ayarlar sekmesinden GitHub Token girin!' : 'Please configure GitHub Token in Settings!', 'error');
        switchAdminTab('settings');
        return;
    }

    // Prevent concurrent syncs
    if (_syncInProgress) {
        showToast(currentLang === 'tr' ? 'Senkronizasyon zaten devam ediyor...' : 'Sync already in progress...', 'info');
        return;
    }

    // Confirmation dialog
    if (!confirm(currentLang === 'tr'
        ? 'Kaydedilen değişiklikler ve görseller siteye yayınlanacak. Devam edilsin mi?'
        : 'Saved changes and images will be published to the site. Continue?')) {
        return;
    }

    _syncInProgress = true;
    setSyncButtonsLoading(true);

    try {
        showToast(currentLang === 'tr' ? 'GitHub ile senkronize ediliyor...' : 'Syncing with GitHub...', 'info');

        const [events, team, categories] = await Promise.all([
            getEvents(),
            getTeamMembers(),
            getCategories()
        ]);

        const preparedEvents = await prepareEventImagesForGitHub(events, token);

        await pushFileToGitHub('data/events.json', JSON.stringify(preparedEvents, null, 2), token);
        await pushFileToGitHub('data/team.json', JSON.stringify(team, null, 2), token);
        await pushFileToGitHub('data/categories.json', JSON.stringify(categories, null, 2), token);

        setEventsData(preparedEvents);
        await processPendingEventImageDeletions(token, preparedEvents);
        clearUnsyncedChanges();
        await renderAdminEvents();

        showToast(currentLang === 'tr' ? 'GitHub ile başarıyla senkronize edildi!' : 'Successfully synced with GitHub!', 'success');
    } catch (err) {
        console.error(err);
        showToast((currentLang === 'tr' ? 'Hata: ' : 'Error: ') + formatGitHubError(err), 'error');
    } finally {
        _syncInProgress = false;
        setSyncButtonsLoading(false);
    }
}

async function handleGitHubPull() {
    const token = getCookie(GITHUB_TOKEN_KEY);
    if (!token) {
        showToast(currentLang === 'tr' ? 'GitHub\'dan veri çekmek için Token gerekli.' : 'Token required to pull from GitHub.', 'error');
        return false;
    }

    // Prevent concurrent operations
    if (_syncInProgress) {
        showToast(currentLang === 'tr' ? 'İşlem zaten devam ediyor...' : 'Operation already in progress...', 'info');
        return false;
    }

    if (hasUnsyncedChanges() && !confirm(currentLang === 'tr'
        ? 'Henüz siteye yayınlanmamış değişiklikler var. En güncel verileri çekerseniz bu değişiklikler silinir. Devam edilsin mi?'
        : 'Some changes have not been published yet. Getting the latest data will discard them. Continue?')) {
        return false;
    }

    _syncInProgress = true;
    setSyncButtonsLoading(true);

    try {
        showToast(currentLang === 'tr' ? 'GitHub\'dan güncel veriler çekiliyor...' : 'Pulling latest data from GitHub...', 'info');

        const [eventsData, teamData, catData] = await Promise.all([
            fetchFileFromGitHub('data/events.json', token),
            fetchFileFromGitHub('data/team.json', token),
            fetchFileFromGitHub('data/categories.json', token)
        ]);

        // setEventsData / setTeamMembersData / setCategoriesData already update
        // both localStorage AND the in-memory cache, so no need to invalidate after.
        if (eventsData) setEventsData(eventsData);
        if (teamData) setTeamMembersData(teamData);
        if (catData) setCategoriesData(catData);
        localStorage.removeItem(EVENT_IMAGE_DELETION_KEY);
        clearUnsyncedChanges();

        await Promise.all([
            loadCategorySelector(),
            renderAdminEvents(),
            renderAdminTeam(),
            renderAdminCategories()
        ]);

        showToast(currentLang === 'tr' ? 'Veriler başarıyla güncellendi!' : 'Data successfully updated!', 'success');
        return true;
    } catch (err) {
        console.error(err);
        showToast((currentLang === 'tr' ? 'Çekme Hatası: ' : 'Pull Error: ') + formatGitHubError(err), 'error');
        return false;
    } finally {
        _syncInProgress = false;
        setSyncButtonsLoading(false);
    }
}

async function fetchFileFromGitHub(path, token) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.raw'
        }
    });
    if (!res.ok) {
        if (res.status === 404) return null; // File doesn't exist yet
        throw new Error(`Failed to fetch ${path}`);
    }
    return await res.json();
}

async function fetchFileSHA(url, token) {
    try {
        const getRes = await fetch(`${url}?ref=${GITHUB_BRANCH}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        });
        if (getRes.ok) {
            const data = await getRes.json();
            return data.sha;
        }
    } catch (e) {
        console.warn(`Error fetching SHA:`, e);
    }
    return null;
}

function bytesToBase64(bytes) {
    const chunks = [];
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
    }
    return btoa(chunks.join(''));
}

function parseImageDataUrl(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || '');
    if (!match) throw new Error(currentLang === 'tr' ? 'Görsel verisi okunamadı.' : 'Image data could not be read.');

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return { mimeType: match[1].toLowerCase(), bytes };
}

async function hashBytes(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function getImageExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif'
    };
    const extension = extensions[mimeType];
    if (!extension) {
        throw new Error(currentLang === 'tr'
            ? `Desteklenmeyen eski görsel formatı: ${mimeType}`
            : `Unsupported legacy image format: ${mimeType}`);
    }
    return extension;
}

async function prepareEventImagesForGitHub(events, token) {
    const prepared = events.map(event => ({ ...event }));
    const pending = prepared.filter(event => typeof event.image === 'string' && event.image.startsWith('data:image/'));

    for (let index = 0; index < pending.length; index += 1) {
        const event = pending[index];
        const message = t('admin.uploadingImages')
            .replace('{current}', String(index + 1))
            .replace('{total}', String(pending.length));
        showToast(message, 'info');

        const { mimeType, bytes } = parseImageDataUrl(event.image);
        const hash = (await hashBytes(bytes)).slice(0, 12);
        const safeEventId = String(event.id || `event-${index + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 64) || `event-${index + 1}`;
        const path = `assets/events/${safeEventId}-${hash}.${getImageExtension(mimeType)}`;

        await pushBytesToGitHub(path, bytes, token, `Admin Panel: Add event image ${safeEventId}`);
        event.image = path;
    }

    return prepared;
}

async function deleteFileFromGitHub(path, token) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    const sha = await fetchFileSHA(url, token);
    if (!sha) return;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Admin Panel: Remove unused event image ${path}`,
            sha,
            branch: GITHUB_BRANCH
        })
    });
    if (!response.ok && response.status !== 404) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Failed to delete ${path}`);
    }
}

async function processPendingEventImageDeletions(token, events) {
    let queued = [];
    try {
        queued = JSON.parse(localStorage.getItem(EVENT_IMAGE_DELETION_KEY) || '[]');
    } catch {
        queued = [];
    }
    if (!Array.isArray(queued) || queued.length === 0) return;

    const referenced = new Set(events.map(event => event.image).filter(isManagedEventImagePath));
    const failed = [];
    for (const path of queued) {
        if (referenced.has(path)) continue;
        try {
            await deleteFileFromGitHub(path, token);
        } catch (error) {
            console.warn(`Could not remove unused image ${path}`, error);
            failed.push(path);
        }
    }

    if (failed.length > 0) localStorage.setItem(EVENT_IMAGE_DELETION_KEY, JSON.stringify(failed));
    else localStorage.removeItem(EVENT_IMAGE_DELETION_KEY);
}

async function pushFileToGitHub(path, content, token, _isRetry = false) {
    const bytes = new TextEncoder().encode(content);
    return pushBytesToGitHub(path, bytes, token, `Admin Panel: Update ${path}`, _isRetry);
}

async function pushBytesToGitHub(path, bytes, token, message, _isRetry = false) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

    // 1. Get file SHA
    let sha = await fetchFileSHA(url, token);

    // 2. Push to GitHub
    const body = {
        message,
        content: bytesToBase64(bytes),
        branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        const status = putRes.status;

        // Auto-retry once on 409 Conflict (SHA mismatch from concurrent edit)
        if (status === 409 && !_isRetry) {
            console.warn(`SHA conflict for ${path}, retrying...`);
            return pushBytesToGitHub(path, bytes, token, message, true);
        }

        // User-friendly error messages
        if (status === 403) {
            throw new Error(currentLang === 'tr'
                ? 'Yetki hatası: Token\'ın yeterli izinlere sahip olduğundan emin olun (repo yetkisi gerekli).'
                : 'Permission denied: Ensure your token has the required "repo" scope.');
        }
        if (status === 409) {
            throw new Error(currentLang === 'tr'
                ? 'Çakışma hatası: Depoda eşzamanlı bir değişiklik var. Lütfen tekrar deneyin.'
                : 'Conflict: The repository was modified concurrently. Please try again.');
        }
        throw new Error(errData.message || 'Failed to push to GitHub');
    }
}

/**
 * Format GitHub API errors into user-friendly messages
 */
function formatGitHubError(err) {
    const msg = err.message || '';
    if (msg.includes('Bad credentials') || msg.includes('401')) {
        return currentLang === 'tr' ? 'Geçersiz token. Lütfen Ayarlar\'dan kontrol edin.' : 'Invalid token. Please check Settings.';
    }
    return msg || (currentLang === 'tr' ? 'Bilinmeyen hata' : 'Unknown error');
}


/* ========================================
   Initialize Admin Panel
   ======================================== */

async function initAdmin() {
    const loginScreen = document.getElementById('admin-login-screen');
    const adminContent = document.getElementById('admin-content');

    if (await isAdminAuthenticated()) {
        loginScreen.classList.add('hidden');
        adminContent.classList.remove('hidden');

        // Preserve unpublished local work instead of replacing it during startup.
        const token = getCookie(GITHUB_TOKEN_KEY);
        if (token && !hasUnsyncedChanges()) {
            await handleGitHubPull();
        } else {
            // Pre-warm all caches locally
            await Promise.all([getCategories(), getEvents(), getTeamMembers()]);
            await Promise.all([
                loadCategorySelector(),
                renderAdminEvents(),
                renderAdminTeam(),
                renderAdminCategories()
            ]);
        }
        setupAdminForms();
        updatePublishStatus();
    } else {
        loginScreen.classList.remove('hidden');
        adminContent.classList.add('hidden');
    }

    // Login form
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password-input').value;
            const success = await adminLogin(password);
            if (success) {
                loginScreen.classList.add('hidden');
                adminContent.classList.remove('hidden');

                const token = getCookie(GITHUB_TOKEN_KEY);
                if (token && !hasUnsyncedChanges()) {
                    await handleGitHubPull();
                } else {
                    await Promise.all([getCategories(), getEvents(), getTeamMembers()]);
                    await Promise.all([
                        loadCategorySelector(),
                        renderAdminEvents(),
                        renderAdminTeam(),
                        renderAdminCategories()
                    ]);
                }
                setupAdminForms();
                updatePublishStatus();
            } else {
                showToast(t('admin.wrongPassword'), 'error');
                document.getElementById('admin-password-input').value = '';
                // Shake animation
                const card = loginForm.closest('.bg-card-dark');
                if (card) {
                    card.style.animation = 'shake 0.5s ease';
                    setTimeout(() => card.style.animation = '', 500);
                }
            }
        });
    }
}

function setupAdminForms() {
    // Event form
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventFormSubmit);
    }
    if (!document.querySelector('#event-sessions-list [data-session-row]')) {
        resetEventDynamicFields();
    }

    // Team form
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', handleTeamFormSubmit);
    }

    // Image upload for events
    setupEventImageUpload();
    setupUrlInput('event-image-url', 'event-image-preview', (url) => {
        currentEventImage = url;
    });

    // Photo upload for team
    setupImageUpload('member-photo-drop', 'member-photo-preview', (img) => {
        currentMemberPhoto = img;
    });

    // Category cards (event form)
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            updateCategorySelector(card.dataset.category);
        });
    });

    // Category form
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
    }

    // Color picker
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            currentCategoryColor = color;
            const colorInput = document.querySelector('input[name="color"]');
            if (colorInput) colorInput.value = color;
            updateColorPicker(color);
        });
    });

    // Icon preview
    const iconInput = document.querySelector('#category-form input[name="icon"]');
    const iconPreview = document.getElementById('category-icon-preview');
    if (iconInput && iconPreview) {
        iconInput.addEventListener('input', () => {
            iconPreview.textContent = iconInput.value.trim() || 'category';
        });
    }

    // GitHub settings form
    const githubForm = document.getElementById('github-settings-form');
    if (githubForm) {
        // Load existing token
        const existingToken = getCookie(GITHUB_TOKEN_KEY);
        if (existingToken) {
            const tokenInput = document.getElementById('github-token-input');
            if (tokenInput) tokenInput.value = existingToken;
        }

        githubForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tokenInput = document.getElementById('github-token-input');
            const token = tokenInput ? tokenInput.value.trim() : '';
            if (token) {
                // Validate token before saving
                const submitBtn = githubForm.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; }
                showToast(currentLang === 'tr' ? 'Token doğrulanıyor...' : 'Validating token...', 'info');

                try {
                    const res = await fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${token}` }
                    });
                    if (!res.ok) {
                        showToast(currentLang === 'tr' ? 'Geçersiz token! Lütfen kontrol edin.' : 'Invalid token! Please check and try again.', 'error');
                        return;
                    }
                    setCookie(GITHUB_TOKEN_KEY, token, 365); // 1 year persistence
                    showToast(currentLang === 'tr' ? 'Token doğrulandı ve kaydedildi!' : 'Token validated and saved!', 'success');
                } catch {
                    showToast(currentLang === 'tr' ? 'Token doğrulama başarısız. İnternet bağlantınızı kontrol edin.' : 'Token validation failed. Check your internet connection.', 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
                }
            } else {
                deleteCookie(GITHUB_TOKEN_KEY);
                showToast(currentLang === 'tr' ? 'Token kaldırıldı.' : 'Token removed.', 'info');
            }
        });
    }
}
