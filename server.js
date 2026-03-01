/* ========================================
   Gazi DOTT — Express Server
   Handles auth, data persistence, file uploads
   ======================================== */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');

const app = express();
const PORT = process.env.PORT || 3000;

/* ========================================
   Configuration
   ======================================== */

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const TEAM_FILE = path.join(DATA_DIR, 'team.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Fail-fast: require critical secrets ──
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET env var is not set. Exiting.');
    process.exit(1);
}

const ADMIN_PASSWORD_HASH_ENV = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD_HASH_ENV && !ADMIN_PASSWORD_RAW) {
    console.error('FATAL: ADMIN_PASSWORD_HASH or ADMIN_PASSWORD env var is not set. Exiting.');
    process.exit(1);
}

// Pre-hash the admin password at startup (awaited in start())
let adminPasswordHash = null;

/* ========================================
   Middleware
   ======================================== */

// Security headers (helmet) with tailored CSP for this site
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com", "/uploads/"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    }
}));

// Response compression (gzip/brotli)
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '5mb' }));

// Session middleware with HttpOnly secure cookies
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,      // Not accessible via document.cookie
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000  // 24 hours
    }
}));

// CSRF protection — check Origin/Referer on state-changing requests
app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const origin = req.get('Origin') || req.get('Referer') || '';
        const allowed = `http://localhost:${PORT}`;
        if (!origin.startsWith(allowed)) {
            return res.status(403).json({ error: 'CSRF check failed' });
        }
    }
    next();
});

// Serve static files from public/ only (prevents exposing server files)
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    index: 'index.html',
    maxAge: '1d'
}));

// Serve uploaded files (long cache — filenames are unique hashes)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

// Auth middleware for protected routes
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
}

/* ========================================
   File Helpers
   ======================================== */

function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

/* ========================================
   ID Generation (server-side)
   ======================================== */

const crypto = require('crypto');

function generateId(prefix = 'evt') {
    const random = crypto.randomBytes(6).toString('hex');
    return `${prefix}_${Date.now()}_${random}`;
}

/* ========================================
   Input Sanitization & Schema Helpers
   ======================================== */

// Strip HTML tags using sanitize-html (robust against bypass vectors)
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
}

// Recursively sanitize all string values in an object
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

// Pick only allowed fields from an object
function pickFields(obj, allowedFields) {
    const result = {};
    for (const field of allowedFields) {
        if (obj.hasOwnProperty(field)) {
            result[field] = obj[field];
        }
    }
    return result;
}

// Schema definitions: allowed fields per entity type
const SCHEMAS = {
    event: ['title_tr', 'title_en', 'description_tr', 'description_en', 'date', 'time', 'category', 'location', 'image', 'link'],
    team: ['name', 'role_tr', 'role_en', 'photo', 'order'],
    category: ['name_tr', 'name_en', 'icon', 'color']
};

// Validate + sanitize incoming body for a given schema type
function validateBody(body, schemaType) {
    const allowed = SCHEMAS[schemaType];
    if (!allowed) throw new Error('Unknown schema type');
    const picked = pickFields(body, allowed);
    return sanitizeObject(picked);
}

// Validate + sanitize an imported item (preserves id, createdAt, updatedAt, order)
function validateImportItem(item, schemaType) {
    const allowed = SCHEMAS[schemaType];
    if (!allowed) throw new Error('Unknown schema type');
    const preserveFields = ['id', 'createdAt', 'updatedAt', 'order'];
    const picked = pickFields(item, [...allowed, ...preserveFields]);
    return sanitizeObject(picked);
}

/* ========================================
   Auth Routes
   ======================================== */

// Rate limiter for login: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    // Wait for hash to be ready (first-run edge case)
    if (!adminPasswordHash) {
        return res.status(503).json({ error: 'Server initializing, try again' });
    }

    const match = await bcrypt.compare(password, adminPasswordHash);
    if (match) {
        req.session.authenticated = true;
        return res.json({ success: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        return res.json({ success: true });
    });
});

app.get('/api/auth/status', (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

/* ========================================
   Events Routes
   ======================================== */

// GET all events (public)
app.get('/api/events', (req, res) => {
    const events = readJSON(EVENTS_FILE);
    res.json(events);
});

// POST create event (auth required)
app.post('/api/events', requireAuth, (req, res) => {
    const events = readJSON(EVENTS_FILE);
    const sanitized = validateBody(req.body, 'event');
    const eventData = {
        ...sanitized,
        id: generateId('evt'),
        createdAt: new Date().toISOString()
    };

    events.push(eventData);
    writeJSON(EVENTS_FILE, events);
    res.status(201).json(eventData);
});

// PUT update event (auth required)
app.put('/api/events/:id', requireAuth, (req, res) => {
    const events = readJSON(EVENTS_FILE);
    const idx = events.findIndex(e => e.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const sanitized = validateBody(req.body, 'event');
    events[idx] = {
        ...events[idx],
        ...sanitized,
        id: req.params.id, // Prevent ID change
        updatedAt: new Date().toISOString()
    };
    writeJSON(EVENTS_FILE, events);
    res.json(events[idx]);
});

// DELETE single event (auth required)
app.delete('/api/events/:id', requireAuth, (req, res) => {
    // Handle the special "past" endpoint
    if (req.params.id === 'past') {
        const events = readJSON(EVENTS_FILE);
        const now = Date.now();
        const filtered = events.filter(e => new Date(e.date).getTime() >= now);
        writeJSON(EVENTS_FILE, filtered);
        return res.json({ success: true, removed: events.length - filtered.length });
    }

    const events = readJSON(EVENTS_FILE);
    const filtered = events.filter(e => e.id !== req.params.id);
    if (filtered.length === events.length) {
        return res.status(404).json({ error: 'Event not found' });
    }
    writeJSON(EVENTS_FILE, filtered);
    res.json({ success: true });
});

/* ========================================
   Categories Routes
   ======================================== */

// GET all categories (public)
app.get('/api/categories', (req, res) => {
    const categories = readJSON(CATEGORIES_FILE);
    res.json(categories);
});

// POST create category (auth required)
app.post('/api/categories', requireAuth, (req, res) => {
    const categories = readJSON(CATEGORIES_FILE);
    const sanitized = validateBody(req.body, 'category');
    const { name_tr, name_en, icon, color } = sanitized;

    if (!name_tr && !name_en) {
        return res.status(400).json({ error: 'Category name required' });
    }

    // Generate slug-style id from name
    const baseName = (name_en || name_tr).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const id = baseName || generateId('cat');

    // Check for duplicate id
    if (categories.find(c => c.id === id)) {
        return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const categoryData = { id, name_tr: name_tr || '', name_en: name_en || '', icon: icon || 'category', color: color || 'gray' };
    categories.push(categoryData);
    writeJSON(CATEGORIES_FILE, categories);
    res.status(201).json(categoryData);
});

// PUT update category (auth required)
app.put('/api/categories/:id', requireAuth, (req, res) => {
    const categories = readJSON(CATEGORIES_FILE);
    const idx = categories.findIndex(c => c.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Category not found' });
    }

    const sanitized = validateBody(req.body, 'category');
    categories[idx] = {
        ...categories[idx],
        ...sanitized,
        id: req.params.id // Prevent ID change
    };
    writeJSON(CATEGORIES_FILE, categories);
    res.json(categories[idx]);
});

// DELETE category (auth required)
app.delete('/api/categories/:id', requireAuth, (req, res) => {
    const categories = readJSON(CATEGORIES_FILE);
    const filtered = categories.filter(c => c.id !== req.params.id);
    if (filtered.length === categories.length) {
        return res.status(404).json({ error: 'Category not found' });
    }
    writeJSON(CATEGORIES_FILE, filtered);
    res.json({ success: true });
});

/* ========================================
   Team Routes
   ======================================== */

// GET all team members (public)
app.get('/api/team', (req, res) => {
    const team = readJSON(TEAM_FILE);
    res.json(team);
});

// POST create team member (auth required)
app.post('/api/team', requireAuth, (req, res) => {
    const team = readJSON(TEAM_FILE);
    const sanitized = validateBody(req.body, 'team');
    const memberData = {
        ...sanitized,
        id: generateId('member'),
        order: team.length
    };

    team.push(memberData);
    writeJSON(TEAM_FILE, team);
    res.status(201).json(memberData);
});

// PUT update team member (auth required)
app.put('/api/team/:id', requireAuth, (req, res) => {
    const team = readJSON(TEAM_FILE);
    const idx = team.findIndex(m => m.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Member not found' });
    }

    const sanitized = validateBody(req.body, 'team');
    team[idx] = {
        ...team[idx],
        ...sanitized,
        id: req.params.id // Prevent ID change
    };
    writeJSON(TEAM_FILE, team);
    res.json(team[idx]);
});

// DELETE team member (auth required)
app.delete('/api/team/:id', requireAuth, (req, res) => {
    const team = readJSON(TEAM_FILE);
    const filtered = team.filter(m => m.id !== req.params.id);
    if (filtered.length === team.length) {
        return res.status(404).json({ error: 'Member not found' });
    }
    writeJSON(TEAM_FILE, filtered);
    res.json({ success: true });
});

// PATCH move team member (auth required)
app.patch('/api/team/:id/move', requireAuth, (req, res) => {
    const { direction } = req.body; // 'up' or 'down'
    if (!direction || !['up', 'down'].includes(direction)) {
        return res.status(400).json({ error: 'Invalid direction' });
    }

    const team = readJSON(TEAM_FILE);
    team.sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = team.findIndex(m => m.id === req.params.id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Member not found' });
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= team.length) {
        return res.status(400).json({ error: 'Cannot move further' });
    }

    // Swap orders
    const tempOrder = team[idx].order;
    team[idx].order = team[swapIdx].order;
    team[swapIdx].order = tempOrder;

    writeJSON(TEAM_FILE, team);
    res.json({ success: true });
});

/* ========================================
   File Upload Route
   ======================================== */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
        cb(null, name);
    }
});

// Magic-number signatures for image validation
const MAGIC_NUMBERS = {
    '.jpg': [0xFF, 0xD8, 0xFF],
    '.jpeg': [0xFF, 0xD8, 0xFF],
    '.png': [0x89, 0x50, 0x4E, 0x47],
    '.gif': [0x47, 0x49, 0x46, 0x38],
    '.webp': [0x52, 0x49, 0x46, 0x46]  // RIFF header
};

function validateMagicNumber(filePath, ext) {
    const expected = MAGIC_NUMBERS[ext];
    if (!expected) return false;
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(expected.length);
        fs.readSync(fd, buf, 0, expected.length, 0);
        fs.closeSync(fd);
        return expected.every((byte, i) => buf[i] === byte);
    } catch {
        return false;
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (.jpg, .png, .gif, .webp)'));
        }
    }
});

app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file signature (magic number)
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    if (!validateMagicNumber(filePath, ext)) {
        // Delete the spoofed file
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        return res.status(400).json({ error: 'File content does not match its extension. Upload rejected.' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

// Handle multer errors gracefully
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large (max 2MB)' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

/* ========================================
   Data Import / Export Routes
   ======================================== */

app.get('/api/data/export', requireAuth, (req, res) => {
    const data = {
        events: readJSON(EVENTS_FILE),
        team: readJSON(TEAM_FILE),
        categories: readJSON(CATEGORIES_FILE)
    };
    res.json(data);
});

app.post('/api/data/import', requireAuth, (req, res) => {
    const data = req.body;
    const MAX_IMPORT_ITEMS = 500;
    try {
        // Helper: validate array items against schema, strip unknown fields, sanitize
        function validateImportArray(arr, schemaType) {
            if (!Array.isArray(arr)) return null;
            if (arr.length > MAX_IMPORT_ITEMS) {
                throw new Error(`Import exceeds max ${MAX_IMPORT_ITEMS} items`);
            }
            return arr
                .filter(item => item !== null && typeof item === 'object' && !Array.isArray(item))
                .map(item => validateImportItem(item, schemaType));
        }

        // Create automatic backups before overwriting
        function backupFile(filePath) {
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, filePath + '.bak');
            }
        }

        if (Array.isArray(data)) {
            // Legacy format: just events array
            const validated = validateImportArray(data, 'event');
            if (!validated || validated.length === 0) {
                return res.status(400).json({ error: 'Invalid events array structure' });
            }
            backupFile(EVENTS_FILE);
            writeJSON(EVENTS_FILE, validated);
        } else if (data && typeof data === 'object') {
            if (data.events) {
                const validated = validateImportArray(data.events, 'event');
                if (!validated) return res.status(400).json({ error: 'Invalid events structure' });
                backupFile(EVENTS_FILE);
                writeJSON(EVENTS_FILE, validated);
            }
            if (data.team) {
                const validated = validateImportArray(data.team, 'team');
                if (!validated) return res.status(400).json({ error: 'Invalid team structure' });
                backupFile(TEAM_FILE);
                writeJSON(TEAM_FILE, validated);
            }
            if (data.categories) {
                const validated = validateImportArray(data.categories, 'category');
                if (!validated) return res.status(400).json({ error: 'Invalid categories structure' });
                backupFile(CATEGORIES_FILE);
                writeJSON(CATEGORIES_FILE, validated);
            }
        } else {
            return res.status(400).json({ error: 'Unexpected data format' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: 'Import failed: ' + err.message });
    }
});

/* ========================================
   Start Server
   ======================================== */

// Await password hash before accepting connections (prevents auth-bypass race)
async function start() {
    if (ADMIN_PASSWORD_HASH_ENV) {
        // Use pre-computed hash from env (faster startup, no plaintext needed)
        adminPasswordHash = ADMIN_PASSWORD_HASH_ENV;
        console.log('✓ Admin password hash loaded from env');
    } else {
        // Fallback: hash raw password at startup (~300ms)
        adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD_RAW, 12);
        console.log('✓ Admin password hash generated (consider setting ADMIN_PASSWORD_HASH in .env)');
    }

    app.listen(PORT, () => {
        console.log(`\n🎮 Gazi DOTT Server running at http://localhost:${PORT}`);
        console.log(`📁 Serving static files from ${path.join(__dirname, 'public')}`);
        console.log(`🖼  Uploads directory: ${UPLOADS_DIR}`);
        console.log(`📊 Data directory: ${DATA_DIR}\n`);
    });
}
start();
