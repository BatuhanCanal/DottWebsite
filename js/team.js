/* ========================================
   Gazi DOTT — Team Member Manager
   Static-first: local overrides + JSON fallback
   ======================================== */

// In-memory cache for team members
let _teamCache = null;
let _teamCacheTime = 0;
const TEAM_CACHE_TTL = 5000; // 5 seconds
const TEAM_STORAGE_KEY = 'dott-team-data';

function readStoredTeam() {
    try {
        const raw = localStorage.getItem(TEAM_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeStoredTeam(team) {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(Array.isArray(team) ? team : []));
}

function normalizeTeamOrder(team) {
    return team
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((member, idx) => ({ ...member, order: idx }));
}

/**
 * Get all team members from local overrides or static JSON.
 */
async function getTeamMembers() {
    const now = Date.now();
    if (_teamCache && (now - _teamCacheTime) < TEAM_CACHE_TTL) {
        return _teamCache;
    }

    const stored = readStoredTeam();
    if (stored) {
        _teamCache = stored;
        _teamCacheTime = now;
        return _teamCache;
    }

    try {
        const response = await fetch('data/team.json');
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

function setTeamMembersData(team) {
    const normalized = normalizeTeamOrder(Array.isArray(team) ? team : []);
    writeStoredTeam(normalized);
    _teamCache = normalized;
    _teamCacheTime = Date.now();
}

function resetTeamMembersData() {
    localStorage.removeItem(TEAM_STORAGE_KEY);
    invalidateTeamCache();
}

/**
 * Add a new team member
 */
async function addTeamMember(memberData) {
    const team = (await getTeamMembers()).slice();
    const created = {
        ...memberData,
        id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        order: team.length
    };
    team.push(created);
    setTeamMembersData(team);
    return created;
}

/**
 * Update a team member
 */
async function updateTeamMember(id, data) {
    const team = (await getTeamMembers()).slice();
    const idx = team.findIndex(m => m.id === id);
    if (idx !== -1) {
        team[idx] = { ...team[idx], ...data, id, order: team[idx].order || 0 };
        setTeamMembersData(team);
        return team[idx];
    }
}

/**
 * Delete a team member
 */
async function deleteTeamMember(id) {
    const team = (await getTeamMembers()).filter(m => m.id !== id);
    setTeamMembersData(team);
}

/**
 * Move a team member up or down
 */
async function moveTeamMember(id, direction) {
    const team = normalizeTeamOrder(await getTeamMembers());
    const idx = team.findIndex(m => m.id === id);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= team.length) return;

    const tempOrder = team[idx].order;
    team[idx].order = team[swapIdx].order;
    team[swapIdx].order = tempOrder;
    setTeamMembersData(team);
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
            <div class="hud-panel-muted col-span-full flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center text-text-muted">
                <span class="material-symbols-outlined mb-3 block text-4xl text-primary">group</span>
                <p class="text-sm">${currentLang === 'tr' ? 'Ekip bilgileri yakında eklenecektir.' : 'Team information will be added soon.'}</p>
            </div>`;
        return;
    }

    container.innerHTML = members.map((member, index) => {
        const safeName = escapeHTML(getMemberName(member));
        const safePhoto = escapeHTML(member.photo);
        const safeRole = escapeHTML(getMemberRole(member));

        return `
        <article class="hud-panel card-hover group p-5">
            <div class="mb-5 flex items-center justify-between border-b border-border-dark/70 pb-3">
                <span class="text-[10px] font-bold uppercase text-text-muted">${t('label.coreTeam')}</span>
                <span class="font-mono text-xs text-primary">${String(index + 1).padStart(2, '0')}</span>
            </div>
            <div class="flex items-center gap-4">
                ${member.photo
                    ? `<img src="${safePhoto}" alt="${safeName}" class="h-16 w-16 shrink-0 rounded-lg border border-primary/25 object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                           <span class="material-symbols-outlined text-[28px] text-primary">person</span>
                       </div>`
                    : `<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                           <span class="material-symbols-outlined text-[28px] text-primary">person</span>
                       </div>`
                }
                <div class="min-w-0 text-left">
                    <h3 class="truncate text-base font-bold text-white transition-colors group-hover:text-primary">${safeName}</h3>
                    <p class="mt-1 text-sm font-medium text-text-muted">${safeRole}</p>
                </div>
            </div>
        </article>`;
    }).join('');
}

// (export handled in admin.js for static mode)
