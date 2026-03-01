/* ========================================
   Gazi DOTT — Team Member Manager
   Now uses server API instead of localStorage
   ======================================== */

// In-memory cache for team members
let _teamCache = null;
let _teamCacheTime = 0;
const TEAM_CACHE_TTL = 5000; // 5 seconds

/**
 * Get all team members from server API
 */
async function getTeamMembers() {
    const now = Date.now();
    if (_teamCache && (now - _teamCacheTime) < TEAM_CACHE_TTL) {
        return _teamCache;
    }
    try {
        const response = await fetch('/api/team');
        if (!response.ok) throw new Error('Failed to fetch team');
        _teamCache = await response.json();
        _teamCacheTime = now;
        return _teamCache;
    } catch (err) {
        console.error('Error fetching team:', err);
        return _teamCache || [];
    }
}

/**
 * Invalidate the team cache (call after mutations)
 */
function invalidateTeamCache() {
    _teamCache = null;
    _teamCacheTime = 0;
}

/**
 * Add a new team member via API
 */
async function addTeamMember(memberData) {
    const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
    });
    if (!response.ok) throw new Error('Failed to add member');
    invalidateTeamCache();
    return await response.json();
}

/**
 * Update a team member via API
 */
async function updateTeamMember(id, data) {
    const response = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update member');
    invalidateTeamCache();
    return await response.json();
}

/**
 * Delete a team member via API
 */
async function deleteTeamMember(id) {
    const response = await fetch(`/api/team/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete member');
    invalidateTeamCache();
}

/**
 * Move a team member up or down via API
 */
async function moveTeamMember(id, direction) {
    const response = await fetch(`/api/team/${id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
    });
    if (!response.ok) throw new Error('Failed to move member');
    invalidateTeamCache();
}

/**
 * Get member name
 */
function getMemberName(member) {
    return member.name || '';
}

/**
 * Get member role based on current language
 */
function getMemberRole(member) {
    return currentLang === 'tr' ? (member.role_tr || member.role_en || '') : (member.role_en || member.role_tr || '');
}

/**
 * Render team members on the About page
 */
async function renderTeamMembers() {
    const container = document.getElementById('team-grid');
    if (!container) return;

    const members = await getTeamMembers();
    members.sort((a, b) => (a.order || 0) - (b.order || 0));

    if (members.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-text-muted">
                <span class="material-symbols-outlined text-4xl mb-2 block">group</span>
                <p>${currentLang === 'tr' ? 'Ekip bilgileri yakında eklenecektir.' : 'Team information will be added soon.'}</p>
            </div>`;
        return;
    }

    container.innerHTML = members.map(member => {
        const safeName = escapeHTML(getMemberName(member));
        const safePhoto = escapeHTML(member.photo);
        const safeRole = escapeHTML(getMemberRole(member));

        return `
        <div class="bg-card-dark border border-border-dark rounded-xl p-6 text-center hover:border-primary/30 transition-all card-hover">
            ${member.photo
                ? `<img src="${safePhoto}" alt="${safeName}" class="h-20 w-20 mx-auto rounded-full object-cover mb-4 border-2 border-primary/20" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                   <div class="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 items-center justify-center mb-4 border border-primary/20 hidden">
                       <span class="material-symbols-outlined text-primary text-[32px]">person</span>
                   </div>`
                : `<div class="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                       <span class="material-symbols-outlined text-primary text-[32px]">person</span>
                   </div>`
            }
            <h3 class="text-lg font-bold text-white mb-1">${safeName}</h3>
            <p class="text-sm text-primary font-medium">${safeRole}</p>
        </div>`;
    }).join('');
}

// (exportTeamJSON removed — server export endpoint handles this)
