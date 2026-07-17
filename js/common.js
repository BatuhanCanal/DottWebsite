/* ========================================
   Gazi DOTT — Common JS
   Shared navbar, footer, mobile menu
   ======================================== */

/**
 * Shared color configuration — single source of truth for color-to-class mappings.
 * Used by events.js (badges) and admin.js (category cards/selectors).
 */
const COLOR_CONFIG = {
    // For category badge styling (events.js + admin event cards)
    badge: {
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
        green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
        pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
        purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
        red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
        yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
        cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
        orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
        gray: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
    },
    // For icon text color (admin category selectors/cards)
    iconColor: {
        blue: 'text-blue-400', green: 'text-green-400', pink: 'text-pink-400',
        purple: 'text-purple-400', red: 'text-red-400', yellow: 'text-yellow-400',
        cyan: 'text-cyan-400', orange: 'text-orange-400', gray: 'text-gray-400'
    },
    // For background color (admin category list cards)
    bgColor: {
        blue: 'bg-blue-500', green: 'bg-green-500', pink: 'bg-pink-500',
        purple: 'bg-purple-500', red: 'bg-red-500', yellow: 'bg-yellow-500',
        cyan: 'bg-cyan-500', orange: 'bg-orange-500', gray: 'bg-gray-500'
    }
};

/**
 * Escape HTML special characters to prevent XSS
 * Use this for ALL user-controlled data rendered via innerHTML.
 */
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get the current page name from URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'index';
    return page;
}

/**
 * Generate the navbar HTML
 */
function getNavbarHTML() {
    const page = getCurrentPage();
    const navLinks = [
        { id: 'index', key: 'nav.home', href: 'index.html' },
        { id: 'events', key: 'nav.events', href: 'events.html' },
        { id: 'gamejams', key: 'nav.gamejams', href: 'gamejams.html' },
        { id: 'about', key: 'nav.about', href: 'about.html' },
        { id: 'contact', key: 'nav.contact', href: 'contact.html' },
    ];

    const desktopLinks = navLinks.map(link => {
        const isActive = page === link.id;
        const classes = isActive
            ? 'inline-flex min-h-9 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-bold text-primary'
            : 'inline-flex min-h-9 items-center rounded-lg border border-transparent px-3 text-sm font-medium text-text-muted transition-colors hover:border-border-dark hover:bg-card-dark/60 hover:text-white';
        return `<a class="${classes}" href="${link.href}" ${isActive ? 'aria-current="page"' : ''} data-i18n="${link.key}">${t(link.key)}</a>`;
    }).join('\n                    ');

    const mobileLinks = navLinks.map(link => {
        const isActive = page === link.id;
        const classes = isActive
            ? 'block border-l-2 border-primary bg-primary/10 px-5 py-3 text-base font-bold text-primary'
            : 'block border-l-2 border-transparent px-5 py-3 text-base font-medium text-text-muted transition-colors hover:bg-card-dark/60 hover:text-white';
        return `<a class="${classes}" href="${link.href}" ${isActive ? 'aria-current="page"' : ''} data-i18n="${link.key}">${t(link.key)}</a>`;
    }).join('\n                    ');

    return `
    <header id="main-navbar" class="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/90 shadow-[0_12px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div class="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-4 sm:px-6">
            <div class="flex min-w-0 items-center gap-7">
                <a class="group flex min-w-0 items-center gap-3 text-white" href="index.html" aria-label="Gazi DOTT ana sayfa">
                    <span class="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-primary/40 bg-primary shadow-[5px_5px_0_rgba(244,140,37,0.12)] transition-transform group-hover:-translate-y-0.5">
                        <img src="ClubLogo.jpeg" alt="" class="h-full w-full object-cover" />
                    </span>
                    <span class="truncate font-display text-base font-bold sm:text-lg">Gazi DOTT</span>
                </a>
                <nav class="hidden items-center gap-1 md:flex" aria-label="Ana navigasyon">
                    ${desktopLinks}
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <div class="lang-switch">
                    <button data-lang="tr" class="${currentLang === 'tr' ? 'active' : ''}">TR</button>
                    <button data-lang="en" class="${currentLang === 'en' ? 'active' : ''}">EN</button>
                </div>
                <a href="https://linktr.ee/gazidott" target="_blank" rel="noopener noreferrer" id="join-community-btn"
                    class="command-button command-button-primary hidden sm:inline-flex"
                    data-i18n="nav.joinCommunity">${t('nav.joinCommunity')}<span class="material-symbols-outlined text-[18px]">north_east</span></a>
                <button id="mobile-menu-btn" type="button" aria-label="Menüyü aç" aria-controls="mobile-menu-panel" aria-expanded="false" class="grid h-10 w-10 place-items-center rounded-lg border border-border-dark text-text-muted transition-colors hover:border-primary/40 hover:text-white md:hidden">
                    <span class="material-symbols-outlined text-[24px]">menu</span>
                </button>
            </div>
        </div>
    </header>
    <div id="mobile-menu-overlay" class="fixed inset-0 z-[998] hidden bg-black/70 backdrop-blur-sm" onclick="closeMobileMenu()"></div>
    <div id="mobile-menu-panel" class="fixed bottom-0 right-0 top-0 z-[999] w-80 max-w-[calc(100vw-2rem)] translate-x-full overflow-y-auto border-l border-border-dark bg-background-dark/95 shadow-2xl backdrop-blur-xl" aria-hidden="true">
        <div class="flex h-[72px] items-center justify-between border-b border-border-dark px-5">
            <span class="font-display text-lg font-bold text-white">Gazi DOTT</span>
            <button type="button" onclick="closeMobileMenu()" aria-label="Menüyü kapat" class="grid h-10 w-10 place-items-center rounded-lg border border-border-dark text-text-muted transition-colors hover:border-primary/40 hover:text-white">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <nav class="py-5" aria-label="Mobil navigasyon">
            ${mobileLinks}
        </nav>
        <div class="p-4 border-t border-border-dark">
            <a href="https://linktr.ee/gazidott" target="_blank" rel="noopener noreferrer" id="join-community-btn-mobile"
                class="command-button command-button-primary w-full"
                data-i18n="nav.joinCommunity">${t('nav.joinCommunity')}<span class="material-symbols-outlined text-[18px]">north_east</span></a>
        </div>
    </div>`;
}

/**
 * Generate the footer HTML
 */
function getFooterHTML() {
    return `
    <footer class="border-t border-border-dark bg-background-dark/80 py-8 text-sm">
        <div class="mx-auto max-w-[1180px] px-4 sm:px-6">
            <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div class="flex items-center gap-3">
                    <span class="h-9 w-9 overflow-hidden rounded-lg border border-primary/30 bg-primary">
                        <img src="ClubLogo.jpeg" alt="" class="h-full w-full object-cover" />
                    </span>
                    <div>
                        <span class="block font-display font-bold text-white">Gazi DOTT</span>
                        <span class="block text-[10px] font-bold uppercase text-primary">Play / Make / Share</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-x-6 gap-y-2 text-text-muted">
                    <a class="hover:text-primary transition-colors" href="contact.html" data-i18n="footer.contactUs">${t('footer.contactUs')}</a>
                    <a class="hover:text-primary transition-colors" href="about.html" data-i18n="footer.codeOfConduct">${t('footer.codeOfConduct')}</a>
                </div>
                <div class="text-text-muted md:text-right" data-i18n="footer.copyright">
                    ${t('footer.copyright')}
                </div>
            </div>
        </div>
    </footer>`;
}

/**
 * Mobile menu controls
 */
function openMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const panel = document.getElementById('mobile-menu-panel');
    overlay.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.remove('translate-x-full');
    }, 10);
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const panel = document.getElementById('mobile-menu-panel');
    panel.classList.add('translate-x-full');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Initialize common components
 */
function initCommon() {
    // Insert navbar
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = getNavbarHTML();
    }

    // Insert footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = getFooterHTML();
    }

    // Bind mobile menu button
    setTimeout(() => {
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', openMobileMenu);
        }
    }, 0);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMobileMenu();
    });

    // Initialize i18n
    initI18n();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initCommon);
