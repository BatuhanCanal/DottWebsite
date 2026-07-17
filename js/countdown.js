/* ========================================
   Gazi DOTT — Countdown Timer
   ======================================== */

// Track the active interval to prevent stacking on repeated calls
let _countdownIntervalId = null;

/**
 * Start a countdown timer to a target date
 * @param {string} targetDateStr - ISO date string for the target
 * @param {object} elements - { days, hours, minutes, seconds } DOM elements
 */
function startCountdown(targetDateStr, elements) {
    if (!targetDateStr || !elements) return;

    // Clear any previous countdown to prevent timer stacking
    if (_countdownIntervalId) clearInterval(_countdownIntervalId);

    const targetDate = new Date(targetDateStr).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            if (elements.days) elements.days.textContent = '00';
            if (elements.hours) elements.hours.textContent = '00';
            if (elements.minutes) elements.minutes.textContent = '00';
            if (elements.seconds) elements.seconds.textContent = '00';
            clearInterval(_countdownIntervalId);
            _countdownIntervalId = null;
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (elements.days) elements.days.textContent = String(days).padStart(2, '0');
        if (elements.hours) elements.hours.textContent = String(hours).padStart(2, '0');
        if (elements.minutes) elements.minutes.textContent = String(minutes).padStart(2, '0');
        if (elements.seconds) elements.seconds.textContent = String(seconds).padStart(2, '0');
    }

    update();
    _countdownIntervalId = setInterval(update, 1000);
}

/**
 * Initialize countdown from the nearest upcoming game jam
 */
async function initCountdownFromEvents() {
    const events = await getEvents();
    const now = new Date().getTime();

    // Find the nearest upcoming session across all game jam events.
    const upcomingJams = events
        .filter(event => event.category === 'gamejam')
        .map(event => ({
            event,
            session: getEventSessions(event)
                .find(session => getSessionTimestamp(session) > now)
        }))
        .filter(item => item.session)
        .sort((a, b) => getSessionTimestamp(a.session) - getSessionTimestamp(b.session));

    if (upcomingJams.length > 0) {
        const { event: nextJam, session: nextSession } = upcomingJams[0];
        document.getElementById('countdown-timer')?.classList.remove('opacity-50');
        const els = {
            days: document.getElementById('countdown-days'),
            hours: document.getElementById('countdown-hours'),
            minutes: document.getElementById('countdown-minutes'),
            seconds: document.getElementById('countdown-seconds'),
        };
        const target = `${nextSession.date}T${nextSession.time || '00:00'}`;
        startCountdown(target, els);

        // Update jam info
        const titleEl = document.getElementById('countdown-title');
        const descEl = document.getElementById('countdown-desc');
        if (titleEl) titleEl.textContent = currentLang === 'tr' ? nextJam.title_tr : nextJam.title_en;
        if (descEl) descEl.textContent = currentLang === 'tr' ? nextJam.description_tr : nextJam.description_en;
    } else {
        const titleEl = document.getElementById('countdown-title');
        const descEl = document.getElementById('countdown-desc');
        if (titleEl) titleEl.textContent = t('gamejams.noJams');
        if (descEl) descEl.textContent = '';
        document.getElementById('countdown-timer')?.classList.add('opacity-50');
    }
}
