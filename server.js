/* Masaravie - holistic wellness and conscious living aggregator backend */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security middleware ---

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.geoapify.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow AdSense iframes
}));

// CORS — only allow configured origin (same-origin by default)
const allowedOrigin = process.env.ALLOWED_ORIGIN || null;
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin browser requests, curl during dev)
    if (!origin) return cb(null, true);
    if (!allowedOrigin || origin === allowedOrigin) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// JSON body with size cap
app.use(express.json({ limit: '16kb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // scraping is expensive
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many search requests, please wait a moment.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many contact submissions, please try again later.' },
});

const autocompleteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests.' },
});

app.use('/api/', generalLimiter);

// #region agent log
function agentLog({ runId, hypothesisId, location, message, data }) {
  fetch('http://127.0.0.1:7589/ingest/18f9ee8e-1df4-4ad3-867a-ede28b7e1544', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '201c3b',
    },
    body: JSON.stringify({
      sessionId: '201c3b',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

// Serve static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// --- Domain configuration ---

const SERVICE_CATEGORIES = [
  'yoga',
  'meditation',
  'breathwork',
  'healing',
  'ecstatic dance',
  'massage',
  'sound bath',
  'mystery school',
  'self development',
  'ayerveda',
  'holistic nutrition',
  'conscious living',
  'mental health',
  'spiritual coaching',
  'energy work',
  'reiki',
  'shamanic healing',
  'tarot',
  'astrology',
  'vipanasa meditation',
  'art therapy',
  'DMT'
];

// --- Search result cache ---

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const _searchCache = new Map(); // cacheKey -> { payload, expiresAt }

function searchCacheKey(location, onlineOnly, services) {
  return `${location.toLowerCase()}|${onlineOnly}|${[...services].sort().join(',')}`;
}

function getCachedSearch(key) {
  const entry = _searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _searchCache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCachedSearch(key, payload) {
  // Evict oldest entry beyond 200 to prevent unbounded growth
  if (_searchCache.size >= 200) {
    _searchCache.delete(_searchCache.keys().next().value);
  }
  _searchCache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
}

// --- Puppeteer scraper ---

// Concurrency lock — only one Puppeteer scrape runs at a time
let _scrapeLock = Promise.resolve();

function withScrapeLock(fn) {
  const next = _scrapeLock.then(fn);
  _scrapeLock = next.catch(() => {}); // errors don't block the queue
  return next;
}

let _browser = null;

async function getBrowser() {
  if (_browser) {
    try {
      await _browser.version(); // throws if browser has crashed/closed
      return _browser;
    } catch (err) {
      console.warn('[browser] Existing browser instance unresponsive, restarting.', err.message);
      _browser = null;
    }
  }
  console.log('[browser] Launching new Puppeteer browser instance.');
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

/**
 * Scrape a single Google Maps search query and return raw place objects.
 */
async function scrapeGoogleMapsSearch(query, limit = 20) {
  console.log(`[scraper] Starting scrape — query: "${query}", limit: ${limit}`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    console.log(`[scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Dismiss cookie/consent dialogs if present
    for (const sel of [
      'button[aria-label*="Accept all"]',
      'button[jsname="b3VHJd"]',
      'form[action*="consent"] button:last-child',
    ]) {
      try {
        await page.click(sel, { timeout: 1500 });
        console.log(`[scraper] Dismissed consent dialog via selector: ${sel}`);
        break;
      } catch (_) {}
    }

    // Wait for results feed
    try {
      await page.waitForSelector('[role="feed"]', { timeout: 15000 });
    } catch {
      console.warn(`[scraper] Results feed not found for query: "${query}" — page may have shown a CAPTCHA or empty results.`);
      return [];
    }

    // Scroll the feed to load up to `limit` results
    await page.evaluate(async (target) => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return;
      for (let i = 0; i < 15; i++) {
        const count = feed.querySelectorAll('[role="article"]').length;
        if (count >= target) break;
        feed.scrollTop += 2000;
        await new Promise((r) => setTimeout(r, 700));
        // End-of-list sentinel Google sometimes adds
        if (document.querySelector('.HlvSq')) break;
      }
    }, limit);

    // Extract business data
    const places = await page.evaluate((lim) => {
      const feed = document.querySelector('[role="feed"]');
      if (!feed) return [];

      const articles = Array.from(feed.querySelectorAll('[role="article"]')).slice(0, lim);
      const results = [];

      for (const article of articles) {
        const nameLink = article.querySelector('a[href*="/maps/place/"]');
        const name =
          nameLink?.getAttribute('aria-label') ||
          article.querySelector('.qBF1Pd, [class*="fontHeadlineSmall"]')?.textContent?.trim() ||
          '';
        if (!name) continue;

        // Rating — aria-label like "4.5 stars"
        const ratingEl = article.querySelector('span[aria-label*="star"]');
        const ratingLabel = ratingEl?.getAttribute('aria-label') || '';
        const ratingMatch = ratingLabel.match(/([0-9]+\.?[0-9]*)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        // Review count — usually "(1,234)" somewhere in the text
        const countMatch = (article.textContent || '').match(/\(([0-9,]+)\)/);
        const reviewCount = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : null;

        // Info rows (address, category, etc.)
        const rowEls = article.querySelectorAll('.W4Etrf, [class*="fontBodyMedium"] > div > span');
        const address = Array.from(rowEls)
          .map((el) => el.textContent?.trim())
          .filter(Boolean)
          .join(', ');

        // Lat/lng from the place URL — format: /@lat,lng,zoom z/
        const href = nameLink?.href || '';
        const coordMatch = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
        const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
        const lng = coordMatch ? parseFloat(coordMatch[2]) : null;

        results.push({
          name,
          rating,
          reviewCount,
          address,
          url: href,
          lat,
          lng,
        });
      }

      return results;
    }, limit);

    console.log(`[scraper] Extracted ${places.length} places for query: "${query}"`);
    return places;
  } finally {
    await page.close();
  }
}

// --- Scraper implementations (Google Maps + Instagram meta) ---

async function fetchFromGoogleMaps({ location, services, onlineOnly, limit }) {
  // Combine the chosen services and holistic terms into one or more queries.
  const activeServices =
    services && services.length
      ? services
      : [
          'holistic wellness',
          'conscious living',
          'yoga',
          'meditation',
          'breathwork',
          'healing',
          'ecstatic dance',
          'massage',
          'sound bath',
          'holistic nutrtion',
          'mystery school',
          'mental health',
          'acupuncture',
          'spiritual coaching',
          'energy work',
          'reiki',
          'shamanic healing',
          'tarot',
          'astrology',
          'vipanasa meditation',
          'art therapy',
          'DMT',
        ];

  const baseLocation =
    location && location.trim().length > 0 ? location.trim() : 'near me';

  // Google Maps actors support a dedicated location field; don't bake location into search terms.
  const searchStringsArray = activeServices.map((s) =>
    onlineOnly ? `${s} online` : s
  );

  // #region agent log
  agentLog({
    runId: 'pre-fix',
    hypothesisId: 'H1',
    location: 'server.js:154',
    message: 'fetchFromGoogleMaps derived location/queries',
    data: {
      locationRaw: location || '',
      baseLocation,
      onlineOnly: Boolean(onlineOnly),
      servicesCount: activeServices.length,
      queriesSample: searchStringsArray.slice(0, 3),
      limit: typeof limit === 'number' ? limit : null,
    },
  });
  // #endregion

  // Google Maps is inherently location-based; for "online anywhere" we skip it.
  if (onlineOnly && (!location || !location.trim())) {
    return [];
  }

  // Batch service terms into a few broader queries to reduce browser sessions.
  const chunkSize = 3;
  const queries = [];
  for (let i = 0; i < activeServices.length; i += chunkSize) {
    const chunk = activeServices.slice(i, i + chunkSize);
    const terms = onlineOnly ? chunk.map((s) => `${s} online`) : chunk;
    const q = baseLocation ? `${terms.join(' ')} ${baseLocation}` : terms.join(' ');
    queries.push(q);
  }

  const perQueryLimit = Math.ceil((limit || 40) / queries.length);
  const items = [];

  for (const query of queries) {
    try {
      const results = await withScrapeLock(() => scrapeGoogleMapsSearch(query, perQueryLimit));
      items.push(...results);
    } catch (err) {
      console.error(`[scraper] Scrape failed for query: "${query}" — ${err.message}`);
    }
  }

  // Normalize to Masaravie provider schema
  const providers = items.map((place) => ({
    id: place.url || place.name,
    name: place.name,
    source: 'google_maps',
    services: inferServicesFromText(
      activeServices,
      `${place.name} ${place.address}`
    ),
    location: {
      address: place.address || '',
      city: '',
      country: '',
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    },
    online: onlineOnly || false,
    website: '',
    phone: '',
    rating: place.rating || null,
    reviewCount: place.reviewCount || null,
    reviewsSample: [],
    upcomingEvents: [],
    raw: place,
  }));

  return providers;
}

// async function fetchFromInstagram({ location, services, onlineOnly, limit }) {
//   // Build a broad search query to discover relevant places and events.
//   const activeServices =
//     services && services.length
//       ? services
//       : [
//           'holistic',
//           'yoga',
//           'meditation',
//           'breathwork',
//           'healing',
//           'ecstatic dance',
//           'sound bath',
//           'conscious living',
//           'self development',
//         ];

//   const baseLocation =
//     location && location.trim().length > 0 ? location.trim() : '';

//   const keyword = `${activeServices.join(' ')} ${baseLocation}`.trim();

//   // Input fields are indicative; confirm schema in Apify if needed.
//   const input = {
//     search: keyword,
//     searchType: 'place', // places and local businesses
//     resultsLimit: limit || 60,
//   };

//   const items = await runApifyActor(
//     'apify/instagram-search-scraper',
//     input,
//     { limit }
//   );

//   const now = Date.now();

//   const providers = [];
//   const events = [];

//   (items || []).forEach((item) => {
//     const handle = item.username || item.handle || item.ownerUsername;
//     const providerId = handle || item.id || item.profileUrl;

//     const provider = {
//       id: `ig-${providerId}`,
//       name: item.fullName || item.name || handle,
//       source: 'instagram',
//       services: inferServicesFromText(
//         activeServices,
//         `${item.biography || ''} ${item.category || ''} ${item.caption || ''}`
//       ),
//       location: {
//         address: item.address || '',
//         city: item.city || '',
//         country: item.country || '',
//         lat: item.lat || item.latitude || null,
//         lng: item.lng || item.longitude || null,
//       },
//       online: onlineOnly || false,
//       website: item.website || '',
//       instagramHandle: handle || '',
//       instagramUrl: item.url || item.profileUrl || '',
//       rating: null,
//       reviewCount: null,
//       reviewsSample: [],
//       upcomingEvents: [],
//       raw: item,
//     };

//     providers.push(provider);

//     // Treat posts or content with a future datetime as events
//     if (item.eventStart || item.startTime || item.dateTime) {
//       const ts = new Date(
//         item.eventStart || item.startTime || item.dateTime
//       ).getTime();
//       if (!Number.isNaN(ts) && ts >= now - 6 * 60 * 60 * 1000) {
//         events.push({
//           id: `ig-event-${item.id || providerId}-${ts}`,
//           title:
//             item.eventTitle ||
//             item.caption ||
//             `${provider.name || handle} event`,
//           description: item.caption || '',
//           startsAt: new Date(ts).toISOString(),
//           providerName: provider.name,
//           providerId: provider.id,
//           locationType: onlineOnly ? 'online' : 'in_person',
//           locationLabel: baseLocation || item.locationName || '',
//           source: 'instagram',
//           url: item.url || item.postUrl || '',
//           raw: item,
//         });
//       }
//     }
//   });

//   return { providers, events };
// }

function inferServicesFromText(knownServices, text) {
  const lower = (text || '').toLowerCase();
  const inferred = [];
  knownServices.forEach((s) => {
    if (lower.includes(s.toLowerCase())) {
      inferred.push(s);
    }
  });
  return Array.from(new Set(inferred));
}

function dedupeProviders(providers) {
  const seen = new Map();

  for (const p of providers) {
    const key = `${(p.name || '').toLowerCase()}|${
      (p.location?.address || '').toLowerCase() || ''
    }`;

    if (!seen.has(key)) {
      seen.set(key, p);
    } else {
      const existing = seen.get(key);
      existing.services = Array.from(
        new Set([...(existing.services || []), ...(p.services || [])])
      );
      existing.sources = Array.from(
        new Set(
          [
            ...(existing.sources || [existing.source]),
            ...(p.sources || [p.source]),
          ].filter(Boolean)
        )
      );
      if (p.rating && (!existing.rating || p.rating > existing.rating)) {
        existing.rating = p.rating;
      }
      if (
        p.reviewCount &&
        (!existing.reviewCount || p.reviewCount > existing.reviewCount)
      ) {
        existing.reviewCount = p.reviewCount;
      }
    }
  }

  return Array.from(seen.values());
}

function sortProvidersForCuration(providers) {
  return providers
    .map((p) => {
      const reviewWeight =
        typeof p.reviewCount === 'number'
          ? Math.min(p.reviewCount, 200) / 200
          : 0;
      const ratingWeight =
        typeof p.rating === 'number' ? (p.rating - 3.5) / 1.5 : 0;
      const serviceWeight = (p.services || []).length / SERVICE_CATEGORIES.length;
      const score = ratingWeight * 0.5 + reviewWeight * 0.3 + serviceWeight * 0.2;
      return { ...p, curationScore: score };
    })
    .sort((a, b) => (b.curationScore || 0) - (a.curationScore || 0));
}

function sortEventsForCuration(events) {
  return [...events].sort((a, b) => {
    const ta = new Date(a.startsAt || a.date || a.startTime || 0).getTime();
    const tb = new Date(b.startsAt || b.date || b.startTime || 0).getTime();
    return ta - tb;
  });
}

// --- API routes ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'seven-entry' });
});

app.get('/api/services', (_req, res) => {
  res.json({ services: SERVICE_CATEGORIES });
});

// Location autocomplete proxy (Geoapify)
app.get('/api/location-autocomplete', autocompleteLimiter, async (req, res) => {
  const { q = '' } = req.query;
  const text = String(q || '').trim().slice(0, 200);

  if (!text) {
    return res.json({ suggestions: [] });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return res.json({ suggestions: [] });
  }

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.set('text', text);
    url.searchParams.set('limit', '8');
    url.searchParams.set('apiKey', apiKey);

    const geoRes = await fetch(url.toString());
    if (!geoRes.ok) {
      const snippet = await geoRes.text();
      console.warn(
        `[autocomplete] Geoapify returned ${geoRes.status} ${geoRes.statusText} for query: "${text}" —`,
        snippet.slice(0, 300)
      );
      return res.json({ suggestions: [] });
    }

    const body = await geoRes.json();
    const suggestions =
      (body.features || []).map((f) => {
        const p = f.properties || {};
        const label =
          p.formatted ||
          [p.city, p.state, p.country].filter(Boolean).join(', ');
        return {
          label,
          city: p.city || null,
          country: p.country || null,
          lat: p.lat ?? p.latitude ?? null,
          lng: p.lon ?? p.longitude ?? null,
        };
      }) || [];

    res.json({ suggestions });
  } catch (err) {
    console.error(`[autocomplete] Unexpected error for query: "${text}" — ${err.message}`);
    res.json({ suggestions: [] });
  }
});

// Reverse geocode proxy (Geoapify) — converts lat/lng to a readable city label
app.get('/api/location-reverse', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.json({ label: null });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return res.json({ label: null });
  }

  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('apiKey', apiKey);

    const geoRes = await fetch(url.toString());
    if (!geoRes.ok) {
      console.warn(`[reverse-geocode] Geoapify returned ${geoRes.status} ${geoRes.statusText} for coords: ${lat},${lng}`);
      return res.json({ label: null });
    }

    const body = await geoRes.json();
    const props = (body.features?.[0]?.properties) || {};
    const label = [props.city || props.town || props.village, props.country]
      .filter(Boolean)
      .join(', ');

    res.json({ label: label || null });
  } catch (err) {
    console.error(`[reverse-geocode] Unexpected error for coords: ${lat},${lng} — ${err.message}`);
    res.json({ label: null });
  }
});

app.get('/api/search', searchLimiter, async (req, res) => {
  const {
    location = '',
    onlineOnly: onlineOnlyRaw = 'false',
    services: servicesRaw = '',
    limitProviders: limitProvidersRaw = '40',
    limitEvents: limitEventsRaw = '40',
  } = req.query;

  // Validate and sanitise inputs
  const locationClean = String(location).slice(0, 200).trim();
  const onlineOnly = String(onlineOnlyRaw).toLowerCase() === 'true';
  const services = String(servicesRaw)
    .slice(0, 500)
    .split(',')
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20); // max 20 service filters

  // Clamp provider/event limits to safe range
  const limitProviders = Math.min(Math.max(Number(limitProvidersRaw) || 40, 1), 100);
  const limitEvents = Math.min(Math.max(Number(limitEventsRaw) || 40, 1), 100);

  try {
    // #region agent log
    agentLog({
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'server.js:384',
      message: 'api/search request parsed',
      data: {
        locationRaw: locationClean,
        onlineOnly,
        services,
        limitProviders,
        limitEvents,
      },
    });
    // #endregion

    const cacheKey = searchCacheKey(locationClean, onlineOnly, services);
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      console.log(`[search] Cache hit — location: "${locationClean}", services: [${services.join(', ')}]`);
      return res.json({ ...cached, meta: { ...cached.meta, fromCache: true } });
    }
    console.log(`[search] Cache miss — scraping for location: "${locationClean}", services: [${services.join(', ')}], onlineOnly: ${onlineOnly}`);

    const [gmProviders] = await Promise.all([
      fetchFromGoogleMaps({
        location: locationClean,
        services,
        onlineOnly,
        limit: limitProviders,
      }),
      // fetchFromInstagram({
      //   location: locationClean,
      //   services,
      //   onlineOnly,
      //   limit: limitProviders + limitEvents,
      // }),
    ]);

    const providersCombined = [...gmProviders];

    const dedupedProviders = dedupeProviders(providersCombined);
    const curatedProviders = sortProvidersForCuration(dedupedProviders).slice(
      0,
      limitProviders
    );

    const curatedEvents = sortEventsForCuration([]).slice(0, limitEvents);

    const payload = {
      ok: true,
      providers: curatedProviders,
      events: curatedEvents,
      meta: {
        location: locationClean || null,
        onlineOnly,
        services,
        counts: {
          rawGoogleMaps: gmProviders.length,
          rawInstagramProviders: 0,
          rawInstagramEvents: 0,
          curatedProviders: curatedProviders.length,
          curatedEvents: curatedEvents.length,
        },
      },
    };

    console.log(`[search] Complete — ${curatedProviders.length} providers returned for location: "${locationClean}"`);
    setCachedSearch(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(`[search] Failed for location: "${req.query.location}" — ${err.message}`, err.stack);
    res.status(500).json({
      ok: false,
      error: err.message || 'Search failed',
    });
  }
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

app.post('/api/contact', contactLimiter, (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'All fields are required.' });
  }

  const emailStr = String(email).trim();
  if (!EMAIL_RE.test(emailStr)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  const entry = {
    name: String(name).trim().slice(0, 200),
    email: emailStr.slice(0, 200),
    message: String(message).trim().slice(0, 2000),
    timestamp: new Date().toISOString(),
  };

  const contactsFile = path.join(__dirname, 'contacts.json');
  let contacts = [];
  try {
    contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[contact] Could not read contacts.json (will overwrite): ${err.message}`);
    }
    contacts = [];
  }
  contacts.push(entry);
  try {
    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
    console.log(`[contact] New submission saved — from: ${entry.email}, total entries: ${contacts.length}`);
  } catch (err) {
    console.error(`[contact] Failed to write contacts.json — ${err.message}`);
    return res.status(500).json({ ok: false, error: 'Could not save your message. Please try again.' });
  }

  res.json({ ok: true });
});

// Fallback to index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`Masaravie server listening on http://localhost:${PORT}`);
});

