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
            ? 'text-sm font-bold text-primary'
            : 'text-sm font-medium text-text-muted hover:text-primary transition-colors';
        return `<a class="${classes}" href="${link.href}" data-i18n="${link.key}">${t(link.key)}</a>`;
    }).join('\n                    ');

    const mobileLinks = navLinks.map(link => {
        const isActive = page === link.id;
        const classes = isActive
            ? 'block px-4 py-3 text-base font-bold text-primary border-l-2 border-primary bg-primary/5'
            : 'block px-4 py-3 text-base font-medium text-text-muted hover:text-white hover:bg-card-dark/50 transition-colors border-l-2 border-transparent';
        return `<a class="${classes}" href="${link.href}" data-i18n="${link.key}">${t(link.key)}</a>`;
    }).join('\n                    ');

    return `
    <header id="main-navbar" class="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/95 backdrop-blur supports-[backdrop-filter]:bg-background-dark/80">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div class="flex items-center gap-8">
                <a class="flex items-center gap-3 text-white transition hover:opacity-90" href="index.html">
                    <img src="ClubLogo.jpeg" alt="Gazi DOTT" class="h-9 w-9 rounded-lg object-cover" />
                    <span class="font-display text-lg font-bold tracking-tight">Gazi DOTT</span>
                </a>
                <nav class="hidden md:flex items-center gap-6">
                    ${desktopLinks}
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <div class="lang-switch">
                    <button data-lang="tr" class="${currentLang === 'tr' ? 'active' : ''}">TR</button>
                    <button data-lang="en" class="${currentLang === 'en' ? 'active' : ''}">EN</button>
                </div>
                <a href="https://linktr.ee/gazidott" target="_blank" id="join-community-btn"
                    class="hidden sm:inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background-dark shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all"
                    data-i18n="nav.joinCommunity">${t('nav.joinCommunity')}</a>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-text-muted hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-[24px]">menu</span>
                </button>
            </div>
        </div>
    </header>
    <!-- Mobile menu (outside header to avoid stacking context issues) -->
    <div id="mobile-menu-overlay" class="fixed inset-0 bg-black/50 z-[998] hidden" onclick="closeMobileMenu()"></div>
    <div id="mobile-menu-panel" class="fixed top-0 right-0 bottom-0 w-72 bg-background-dark border-l border-border-dark z-[999] translate-x-full overflow-y-auto">
        <div class="flex items-center justify-between p-4 border-b border-border-dark">
            <span class="font-display text-lg font-bold text-white">Gazi DOTT</span>
            <button onclick="closeMobileMenu()" class="p-2 text-text-muted hover:text-white transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <nav class="py-4">
            ${mobileLinks}
        </nav>
        <div class="p-4 border-t border-border-dark">
            <a href="https://linktr.ee/gazidott" target="_blank" id="join-community-btn-mobile"
                class="block w-full text-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-background-dark hover:bg-orange-400 transition-all"
                data-i18n="nav.joinCommunity">${t('nav.joinCommunity')}</a>
        </div>
    </div>`;
}

/**
 * Generate the footer HTML
 */
function getFooterHTML() {
    return `
    <footer class="bg-background-dark border-t border-border-dark py-12 text-sm">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                <div class="flex items-center gap-3">
                    <img src="ClubLogo.jpeg" alt="Gazi DOTT" class="h-8 w-8 rounded-lg object-cover" />
                    <span class="font-display font-bold text-white">Gazi DOTT</span>
                </div>
                <div class="flex gap-6 text-text-muted">
                    <a class="hover:text-primary transition-colors" href="contact.html" data-i18n="footer.contactUs">${t('footer.contactUs')}</a>
                    <a class="hover:text-primary transition-colors" href="about.html" data-i18n="footer.codeOfConduct">${t('footer.codeOfConduct')}</a>
                </div>
                <div class="text-text-muted" data-i18n="footer.copyright">
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
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const panel = document.getElementById('mobile-menu-panel');
    panel.classList.add('translate-x-full');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
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

    // Initialize i18n
    initI18n();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initCommon);
