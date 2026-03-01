# Gazi DOTT — Full Optimization Audit

**Audit Date:** 2026-03-01  
**Scope:** Complete codebase — `server.js`, all client JS, CSS, 6 HTML pages, config files  
**Stack:** Node.js / Express / JSON‑file persistence / Vanilla JS + TailwindCDN

---

## 1) Optimization Summary

**Overall Health:** Moderate. The codebase is well-structured for a small club website, but has critical I/O inefficiencies on the server, significant frontend loading waste, and extensive code duplication across files.

### Top 3 Highest-Impact Improvements

| # | Issue | Category | Est. Impact |
|---|-------|----------|-------------|
| 1 | **Synchronous file I/O on every request** — `readJSON`/`writeJSON` use `readFileSync`/`writeFileSync`, blocking the event loop on every API call | I/O | High — blocks all concurrent requests |
| 2 | **Tailwind CDN loaded on every page** — ~300KB+ JS parsed & executed per page load instead of a pre-built CSS bundle | Frontend / Network | High — 3–5s first-paint penalty |
| 3 | **Tailwind config duplicated 6×** in every HTML file's `<head>` | Maintainability / Build | Medium — any theme change requires editing 6 files |

### Biggest Risk if No Changes Are Made

Under concurrent admin usage, synchronous file I/O will **serialize all requests**, causing request queuing, elevated latencies, and potential data corruption from race conditions on write (two concurrent writes to the same JSON file can corrupt it).

---

## 2) Findings (Prioritized)

### F1 — Synchronous File I/O Blocks Event Loop

- **Category:** I/O
- **Severity:** Critical
- **Impact:** Latency, throughput, concurrency
- **Evidence:** `readJSON()` at L121–130 and `writeJSON()` at L132–134 in `server.js` use `fs.readFileSync` / `fs.writeFileSync` on every request.
- **Why it's inefficient:** Node.js is single-threaded. Synchronous I/O blocks the entire event loop — every other request waits. With concurrent admin mutations, two `writeFileSync` calls can interleave and corrupt data.
- **Recommended fix:**
  1. Switch to `fs.promises.readFile` / `fs.promises.writeFile` (async).
  2. Implement an in-memory data store loaded at startup, flushed to disk after mutations (write-behind cache). This eliminates per-request disk reads entirely.
  3. Use a write lock (simple mutex/queue) to serialize writes and prevent data races.
- **Tradeoffs / Risks:** Slightly more complex code; in-memory store means crash = loss of last unflushed write (mitigated by writing immediately after mutation).
- **Expected impact estimate:** ~10–50× throughput improvement under concurrent load.
- **Removal Safety:** Safe
- **Reuse Scope:** Server-wide

---

### F2 — Tailwind CSS CDN on Every Page (No Build Step)

- **Category:** Frontend / Network
- **Severity:** High
- **Impact:** Page load time (FCP, LCP), bandwidth, offline capability
- **Evidence:** Every HTML file loads `<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries">` — a ~300KB+ JS file that parses the DOM and generates CSS at runtime.
- **Why it's inefficient:** The CDN script is explicitly marked "for development only" by Tailwind. It re-parses the entire page on every load, generates CSS in JS, and prevents caching of final CSS output. It also blocks rendering.
- **Recommended fix:**
  1. Install Tailwind as a dev dependency (`npm install -D tailwindcss`).
  2. Create a `tailwind.config.js` (already have the config inline — extract it).
  3. Build a static CSS file (`npx tailwindcss -o public/css/tailwind.css --minify`).
  4. Replace the CDN `<script>` with `<link href="css/tailwind.css" rel="stylesheet">`.
- **Tradeoffs / Risks:** Requires a build step; config changes need a rebuild. Add `npm run build:css` script.
- **Expected impact estimate:** ~60–80% reduction in initial page load time. CSS file will be ~10–30KB gzipped vs 300KB+ JS.
- **Removal Safety:** Safe
- **Reuse Scope:** Service-wide (all 6 HTML pages)

---

### F3 — Tailwind Config Duplicated in 6 HTML Files

- **Category:** Maintainability / Code Duplication
- **Severity:** Medium
- **Impact:** Maintenance cost, bug surface area
- **Evidence:** The identical `tailwind.config = { ... }` block (colors, fonts) is copy-pasted into `index.html`, `events.html`, `gamejams.html`, `about.html`, `contact.html`, `admin.html`.
- **Why it's inefficient:** Any theme change (e.g., changing the primary color) requires editing 6 files. Drift risk is high.
- **Recommended fix:** If keeping CDN short-term: extract config to a shared `js/tailwind-config.js` loaded before the CDN script. Long-term: adopt a build step (see F2) and have a single `tailwind.config.js`.
- **Tradeoffs / Risks:** None.
- **Expected impact estimate:** 6× fewer files to edit for theme changes.
- **Removal Safety:** Safe
- **Reuse Scope:** Service-wide
- **Classification:** Reuse Opportunity

---

### F4 — `iconColorMap` / `bgColorMap` Duplicated Across Files

- **Category:** Maintainability / Code Duplication
- **Severity:** Medium
- **Impact:** Maintenance cost, bundle size
- **Evidence:**
  - `iconColorMap` defined in `admin.js` L746–749 AND L797–800.
  - `bgColorMap` defined in `admin.js` L803–807.
  - `COLOR_MAP` defined in `events.js` L90–100.
  - All three map color names to Tailwind classes and serve the same purpose.
- **Why it's inefficient:** Three separate definitions of the same concept. Any color addition (e.g., adding `"teal"`) must be done in 3 places.
- **Recommended fix:** Extract a single shared `COLOR_CONFIG` object into a new `js/colors.js` or into `common.js`, used by both `events.js` and `admin.js`.
- **Tradeoffs / Risks:** Additional shared file or common.js grows slightly.
- **Expected impact estimate:** ~30 lines removed, single source of truth.
- **Removal Safety:** Safe
- **Reuse Scope:** Module-wide (frontend)
- **Classification:** Reuse Opportunity

---

### F5 — Redundant Date Parsing in Event Rendering

- **Category:** CPU / Algorithm
- **Severity:** Low-Medium
- **Impact:** CPU cycles during render
- **Evidence:** In `events.js`, `renderEvents()` calls `new Date(e.date).getTime()` multiple times per event:
  - L319–320: Filter creates `new Date()` for each event twice (upcoming + past filter).
  - L327–328: Sort creates `new Date()` for each comparison (O(n log n) × 2 allocations).
  - Each card render calls `formatDate()`, `formatShortDate()`, `formatDayOfWeek()` — each creates a new `Date` object.
  - Same pattern in `renderGameJams()`, `renderHomePage()`, `renderAdminEvents()`.
- **Why it's inefficient:** `new Date()` is called 4–8 times per event. For 50 events, that's 200–400 unnecessary Date allocations.
- **Recommended fix:** Parse date once per event into a `timestamp` field (or memoize), use the cached value for filtering and sorting.
- **Tradeoffs / Risks:** Minimal.
- **Expected impact estimate:** ~5× fewer Date allocations during renders.
- **Removal Safety:** Safe
- **Reuse Scope:** Module-wide (events.js)

---

### F6 — No Server-Side Caching / `Cache-Control` Headers for Static Assets

- **Category:** Caching / Network
- **Severity:** Medium
- **Impact:** Page load latency, bandwidth
- **Evidence:** `express.static()` is called at L101–107 with no `maxAge` option. No `Cache-Control` headers are set for static assets (CSS, JS, images).
- **Why it's inefficient:** Every page visit re-downloads unchanged CSS, JS, and images from the server. Browsers won't cache without explicit headers.
- **Recommended fix:**
  ```js
  app.use(express.static(path.join(__dirname, 'public'), {
      extensions: ['html'],
      index: 'index.html',
      maxAge: '1d' // or '7d' for longer caching
  }));
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));
  ```
- **Tradeoffs / Risks:** Stale assets after deploy — use cache-busting query strings or hashed filenames.
- **Expected impact estimate:** ~50–80% reduction in repeat-visit load time.
- **Removal Safety:** Safe
- **Reuse Scope:** Server-wide

---

### F7 — `setInterval` Leak in Countdown Timer

- **Category:** Reliability / Memory
- **Severity:** Medium
- **Impact:** Memory leak, stale timers
- **Evidence:** `countdown.js` L39: `setInterval(update, 1000)` — the interval ID is never stored, so it can never be cleared.
- **Why it's inefficient:** If `initCountdownFromEvents()` is called multiple times (e.g., on language switch → `renderHomePage()` → `initCountdownFromEvents()`), a new interval stacks on top of the old one. After 5 language switches, 5 intervals tick simultaneously.
- **Recommended fix:** Store the interval ID in a module-level variable; clear it before starting a new one.
  ```js
  let countdownInterval = null;
  function startCountdown(targetDateStr, elements) {
      if (countdownInterval) clearInterval(countdownInterval);
      // ...
      countdownInterval = setInterval(update, 1000);
  }
  ```
- **Tradeoffs / Risks:** None.
- **Expected impact estimate:** Prevents unbounded timer accumulation.
- **Removal Safety:** Safe
- **Reuse Scope:** Local file

---

### F8 — Sequential Admin Init Fetches (Waterfall)

- **Category:** Network / Latency
- **Severity:** Medium
- **Impact:** Admin panel load time
- **Evidence:** `admin.js` L1041–1048:
  ```js
  await loadCategorySelector();   // fetch /api/categories
  await renderAdminEvents();      // fetch /api/events
  await renderAdminTeam();        // fetch /api/team
  await renderAdminCategories();  // fetch /api/categories (again)
  ```
  Four sequential awaits = four round-trip waterfalls. Categories is fetched twice.
- **Why it's inefficient:** These requests are independent and could run in parallel. The duplicate categories fetch is pure waste.
- **Recommended fix:**
  ```js
  await Promise.all([
      getCategories(),
      getEvents(),
      getTeamMembers()
  ]);
  // Then render all views (data is now cached)
  loadCategorySelector();
  renderAdminEvents();
  renderAdminTeam();
  renderAdminCategories();
  ```
- **Tradeoffs / Risks:** None — the cache already handles deduplication.
- **Expected impact estimate:** ~60–70% reduction in admin panel init time (3–4 round trips → 1 parallel batch).
- **Removal Safety:** Safe
- **Reuse Scope:** Local file (admin.js)

---

### F9 — No `gzip` / `compression` Middleware

- **Category:** Network
- **Severity:** Medium
- **Impact:** Transfer size, bandwidth
- **Evidence:** `server.js` has no `compression` middleware. JSON API responses and HTML are served uncompressed.
- **Why it's inefficient:** JSON and HTML compress at ~70–85% ratio. Without compression, larger payloads are sent over the wire.
- **Recommended fix:**
  ```bash
  npm install compression
  ```
  ```js
  const compression = require('compression');
  app.use(compression());
  ```
- **Tradeoffs / Risks:** Slight CPU cost for compression (negligible for this scale).
- **Expected impact estimate:** ~70% reduction in response payload sizes.
- **Removal Safety:** Safe
- **Reuse Scope:** Server-wide

---

### F10 — bcrypt Hash Regenerated on Every Server Start

- **Category:** CPU / Cost
- **Severity:** Low-Medium
- **Impact:** Startup time (~300ms wasted)
- **Evidence:** `server.js` L625: `adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD_RAW, 12)`. The raw password is hashed every time the server starts with cost factor 12.
- **Why it's inefficient:** Hashing is deliberately expensive (~200–400ms). The hash is deterministic for the same input; it could be pre-computed and stored in `.env`.
- **Recommended fix:** Store the pre-hashed password in `.env` instead:
  ```
  ADMIN_PASSWORD_HASH=$2a$12$...
  ```
  Load at startup: `adminPasswordHash = process.env.ADMIN_PASSWORD_HASH`. Provide a one-time script to generate the hash.
- **Tradeoffs / Risks:** Slightly harder to change the password (run a script first). But eliminates the need to store the plaintext password in `.env` at all (security win).
- **Expected impact estimate:** ~300ms faster cold start; plaintext password removed from config.
- **Removal Safety:** Safe
- **Reuse Scope:** Server config

---

### F11 — Client-Side `generateId()` in `admin.js` is Dead Code

- **Category:** Dead Code
- **Severity:** Low
- **Impact:** Code clarity, bundle size
- **Evidence:** `admin.js` L72–77 defines `generateId()` with a comment "for client-side preview only" — but all CRUD operations go through the server API, which generates its own IDs. No call site for this function exists in `admin.js`.
- **Why it's inefficient:** Dead code adds confusion and bytes.
- **Recommended fix:** Remove the function.
- **Tradeoffs / Risks:** None.
- **Expected impact estimate:** Minor (~6 lines removed).
- **Removal Safety:** Safe
- **Reuse Scope:** Local file
- **Classification:** Dead Code

---

### F12 — `ADMIN_AUTH_KEY` Constant is Dead Code

- **Category:** Dead Code
- **Severity:** Low
- **Impact:** Code clarity
- **Evidence:** `admin.js` L10: `const ADMIN_AUTH_KEY = 'dott-admin-auth'` — never referenced elsewhere in the file. Appears to be a leftover from the old client-side auth system.
- **Why it's inefficient:** Confusing artifact that suggests client-side auth still exists.
- **Recommended fix:** Remove the constant.
- **Tradeoffs / Risks:** None.
- **Removal Safety:** Safe
- **Reuse Scope:** Local file
- **Classification:** Dead Code

---

### F13 — `exportTeamJSON()` in `team.js` is Dead Code

- **Category:** Dead Code
- **Severity:** Low
- **Impact:** Code clarity
- **Evidence:** `team.js` L149–152: `exportTeamJSON()` function. No call site exists — the admin export uses `/api/data/export` which exports everything (events + team + categories).
- **Why it's inefficient:** Unused function.
- **Recommended fix:** Remove the function.
- **Tradeoffs / Risks:** None.
- **Removal Safety:** Safe
- **Reuse Scope:** Local file
- **Classification:** Dead Code

---

### F14 — Unused Translation Keys

- **Category:** Dead Code
- **Severity:** Low
- **Impact:** i18n file size, maintenance
- **Evidence:** Several translation keys in `i18n.js` appear to have no matching `data-i18n` attribute or `t()` call in any HTML/JS file:
  - `events.rsvp`, `events.online`
  - `nav.searchPlaceholder`
  - `common.backToTop`, `common.readMore`
  - `footer.privacyPolicy`
  - `nav.admin`
- **Why it's inefficient:** Unused strings increase file size and maintenance burden.
- **Recommended fix:** Audit with a grep for each key; remove confirmed unused keys.
- **Tradeoffs / Risks:** Keys may be needed for future features — mark as intentionally reserved with a comment, or remove and add back later.
- **Expected impact estimate:** ~20 fewer translation entries.
- **Removal Safety:** Needs Verification
- **Reuse Scope:** Local file
- **Classification:** Dead Code

---

### F15 — `express-validator` Imported but Never Used

- **Category:** Dead Code / Build
- **Severity:** Low
- **Impact:** Startup time, memory, `node_modules` size
- **Evidence:** `server.js` L13: `const { body, validationResult } = require('express-validator')`. Neither `body` nor `validationResult` is used anywhere in the code — custom `validateBody()` uses a hand-rolled schema approach instead.
- **Why it's inefficient:** Unnecessary dependency loaded into memory; unused `node_modules` size.
- **Recommended fix:** Remove the import and uninstall the package: `npm uninstall express-validator`.
- **Tradeoffs / Risks:** None.
- **Expected impact estimate:** ~1–2MB less in `node_modules`.
- **Removal Safety:** Safe
- **Reuse Scope:** Server-wide
- **Classification:** Dead Code

---

### F16 — Google Fonts / Material Symbols Loaded on Every Page Without `preconnect`

- **Category:** Frontend / Network
- **Severity:** Low-Medium
- **Impact:** FCP latency
- **Evidence:** All 6 HTML files load two Google Fonts stylesheets (Space Grotesk + Material Symbols) without any `<link rel="preconnect">` hints.
- **Why it's inefficient:** The browser must discover `fonts.googleapis.com`, then `fonts.gstatic.com`, adding 2 extra DNS lookups and TCP connections before fonts start downloading.
- **Recommended fix:** Add before font `<link>` tags:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```
- **Tradeoffs / Risks:** None.
- **Expected impact estimate:** ~100–300ms faster font loading.
- **Removal Safety:** Safe
- **Reuse Scope:** Service-wide

---

### F17 — Language Switch Re-renders Everything Without Waiting for Categories Cache

- **Category:** Reliability / UX
- **Severity:** Low
- **Impact:** Broken badges, race condition on render
- **Evidence:** `i18n.js` L419–423: on language switch, `renderEvents()` and `renderGameJams()` are called without `await`. These functions internally `await getCategories()`, but since the call isn't awaited at the caller level, the DOM may flash with stale/missing category badges.
- **Why it's inefficient:** No functional bug currently (cache usually hits), but creates a subtle race if the cache has expired.
- **Recommended fix:** Await the render calls or ensure cache is pre-warmed before calling.
- **Tradeoffs / Risks:** Minor.
- **Expected impact estimate:** Prevents rare badge rendering glitch.
- **Removal Safety:** Safe
- **Reuse Scope:** Local file

---

### F18 — Hero Background Image Loaded on Pages That Don't Need It

- **Category:** Frontend / Network
- **Severity:** Low
- **Impact:** Bandwidth on pages that don't display the image
- **Evidence:** `index.html` L50 and `gamejams.html` L48 load the same Unsplash image (`photo-1550745165-9bc0b252726f`) via a CSS `background-image`. While only 2 pages use it, the image is quite large and loaded eagerly.
- **Why it's inefficient:** The image is loaded even if the user navigates directly to a specific section of the page and never scrolls to the hero.
- **Recommended fix:** Self-host a compressed/resized version of the image (or use `loading="lazy"` on an `<img>` instead of CSS background). Serve via `/uploads/` with `maxAge` cache headers.
- **Tradeoffs / Risks:** Slight initial setup.
- **Expected impact estimate:** ~200–500KB saved on external fetches.
- **Removal Safety:** Safe
- **Reuse Scope:** Service-wide

---

## 3) Quick Wins (Do First)

| Priority | Finding | Time to Implement | Impact |
|----------|---------|-------------------|--------|
| 1 | **F15** — Remove unused `express-validator` import + package | 2 min | Cleaner deps |
| 2 | **F11, F12, F13** — Remove dead code (`generateId`, `ADMIN_AUTH_KEY`, `exportTeamJSON`) | 5 min | Cleaner code |
| 3 | **F7** — Fix `setInterval` leak in countdown.js | 5 min | Prevents timer stacking |
| 4 | **F6** — Add `maxAge` to `express.static()` | 2 min | Major repeat-visit perf gain |
| 5 | **F16** — Add `<link rel="preconnect">` for Google Fonts | 3 min | ~100–300ms faster fonts |
| 6 | **F9** — Add `compression` middleware | 5 min | ~70% smaller responses |
| 7 | **F8** — Parallelize admin init fetches with `Promise.all` | 10 min | ~60–70% faster admin load |

---

## 4) Deeper Optimizations (Do Next)

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **F1** — Replace sync I/O with in-memory store + async flush | 1–2 hr | Eliminates event loop blocking |
| 2 | **F2** — Replace Tailwind CDN with build step | 1–2 hr | ~80% faster page load |
| 3 | **F3, F4** — Extract shared Tailwind config and color maps | 30 min | Maintainability |
| 4 | **F10** — Store pre-hashed password in `.env` | 15 min | Faster startup, removes plaintext from config |
| 5 | **F5** — Memoize Date parsing in event renderers | 20 min | Fewer allocations |
| 6 | **F14** — Audit and prune unused i18n keys | 20 min | Cleaner translations |
| 7 | **F18** — Self-host and optimize hero background image | 15 min | Less external dependency |

---

## 5) Validation Plan

### Automated Benchmarks

1. **Sync vs Async I/O (F1):**
   ```bash
   # Before: measure with autocannon
   npx autocannon -c 50 -d 10 http://localhost:3000/api/events
   # After: same test with async I/O, compare req/s and latency p99
   ```

2. **Page load (F2, F6, F9, F16):**
   - Run Lighthouse on `index.html` before and after changes.
   - Compare FCP (First Contentful Paint), LCP, and Total Transfer Size.
   - Target: FCP < 1.5s (currently likely 3–5s with CDN).

3. **Admin panel init (F8):**
   - Measure time from `DOMContentLoaded` to `setupAdminForms()` completing.
   - Use `performance.now()` before/after `initAdmin()`.

### Manual Verification

- Language switch: verify no badge flickering after F17 fix.
- Countdown: switch language 5× on homepage, verify only 1 interval runs (check in DevTools → Sources → Event Listener Breakpoints → Timer).
- Admin CRUD: verify all create/update/delete still work after I/O refactor.
- Theme consistency: change primary color in one place, verify all 6 pages reflect it (after F3 fix).

### Test Cases for Correctness

| Test | Expected Result |
|------|-----------------|
| Create event → Read events list | New event appears |
| Update event → Read events list | Updated fields shown |
| Delete event → Read events list | Event removed |
| Concurrent event creates (2 tabs) | Both events saved (no corruption) |
| Import/Export round-trip | Exported JSON re-imports identically |
| Login with wrong password 6 times | Rate limited after 5th |

---

## 6) Optimized Code / Patches

### Patch A — Fix `setInterval` Leak (F7)

```diff
 // countdown.js
+let _countdownIntervalId = null;
+
 function startCountdown(targetDateStr, elements) {
     if (!targetDateStr || !elements) return;
+    if (_countdownIntervalId) clearInterval(_countdownIntervalId);
 
     const targetDate = new Date(targetDateStr).getTime();
 
     function update() {
         // ... unchanged ...
     }
 
     update();
-    setInterval(update, 1000);
+    _countdownIntervalId = setInterval(update, 1000);
 }
```

### Patch B — Parallelize Admin Init (F8)

```diff
 // admin.js — initAdmin()
 if (await isAdminAuthenticated()) {
     loginScreen.classList.add('hidden');
     adminContent.classList.remove('hidden');
-    await loadCategorySelector();
-    await renderAdminEvents();
-    await renderAdminTeam();
-    await renderAdminCategories();
+    // Pre-warm all caches in parallel
+    await Promise.all([getCategories(), getEvents(), getTeamMembers()]);
+    // Render views (data is now cached, no network calls)
+    await Promise.all([
+        loadCategorySelector(),
+        renderAdminEvents(),
+        renderAdminTeam(),
+        renderAdminCategories()
+    ]);
     setupAdminForms();
 }
```

### Patch C — Add Cache-Control + Compression (F6, F9)

```diff
 // server.js — after requiring modules
+const compression = require('compression');

 // ... after helmet middleware ...
+app.use(compression());

 // ... static file serving ...
-app.use(express.static(path.join(__dirname, 'public'), {
-    extensions: ['html'],
-    index: 'index.html'
-}));
-app.use('/uploads', express.static(UPLOADS_DIR));
+app.use(express.static(path.join(__dirname, 'public'), {
+    extensions: ['html'],
+    index: 'index.html',
+    maxAge: '1d'
+}));
+app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));
```

### Patch D — Remove Dead Code (F11, F12, F13, F15)

```diff
 // server.js L13
-const { body, validationResult } = require('express-validator');

 // admin.js L10
-const ADMIN_AUTH_KEY = 'dott-admin-auth';

 // admin.js L72-77
-function generateId(prefix = 'evt') {
-    const arr = new Uint8Array(6);
-    crypto.getRandomValues(arr);
-    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
-    return prefix + '_' + Date.now() + '_' + hex;
-}

 // team.js L149-152
-async function exportTeamJSON() {
-    const members = await getTeamMembers();
-    return JSON.stringify(members, null, 2);
-}
```

### Patch E — Add Font Preconnect (F16)

Add to `<head>` of all 6 HTML files, **before** the Google Fonts `<link>` tags:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```
