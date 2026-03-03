## Masaravie – Holistic Wellness & Conscious Living Aggregator

Masaravie is a minimal full-stack web app that curates **holistic wellness** and **conscious living** providers and events – think yoga, meditation, breathwork, healing, ecstatic dance, massage, sound baths, mystery schools, and self-development offerings.

It acts as a neutral-toned, element-inspired **aggregator** that pulls from Google Maps and Instagram (via Apify Actors) to surface:

- **Providers**: studios, retreats, teachers, and spaces
- **Events**: ceremonies, workshops, ecstatic dances, immersions

The UI has two tabs – **Providers** and **Events** – plus:

- Location search (with “Use my location”)
- Toggle for **online-only** offerings
- Filters by modality (yoga, meditation, breathwork, etc.)

> ⚠️ **Important**: This project integrates with the Apify platform to legally and robustly collect data from Google Maps and Instagram. You’ll need an Apify account and API token before the scrapers can return real results.

---

### 1. Tech stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + HTML + CSS (neutral, five-elements-inspired design)
- **Scraping / data source**: Apify public Actors:
  - Google Maps places: `compass/crawler-google-places`
  - Instagram search: `apify/instagram-search-scraper`
  - Optional location autocomplete: [Geoapify](https://www.geoapify.com/) Places API (via `/api/location-autocomplete`)

---

### 2. Setup

1. **Install dependencies**

   ```bash
   cd sevenEntry
   npm install
   ```

2. **Create your `.env` file**

   Copy the example and fill in your real values:

   ```bash
   cp .env.example .env
   ```

   Then set:

   - **`APIFY_TOKEN`** – from your Apify account (`Account → Integrations → API token`)
   - Optional: **`PORT`** – defaults to `3000`
   - Optional: **`GEOAPIFY_API_KEY`** – if you want live address autocomplete for the location field (get one from Geoapify’s dashboard)

3. **Run the app**

   ```bash
   npm run dev
   # or
   npm start
   ```

   Visit `http://localhost:3000` in your browser.

---

### 3. How the scraping works

The backend exposes a single main API for the frontend:

- `GET /api/search`

Query parameters:

- **`location`** – free text, e.g. `"Bali"`, `"London"`, or `"51.5, -0.1"` (lat,lng)
- **`onlineOnly`** – `"true"` or `"false"`
- **`services`** – comma-separated modalities, e.g. `"yoga,meditation,breathwork"`

Under the hood:

- **Google Maps providers** via `compass/crawler-google-places`
- **Instagram providers + events** via `apify/instagram-search-scraper`
- Results are:
  - Normalised into a common provider/event shape
  - **Deduplicated** when the same place appears multiple times or from both sources
  - **Curated / ranked** by a score that considers:
    - Ratings
    - Review counts
    - How many holistic modalities are detected in the text

> Note: Input schemas for Apify Actors may evolve. The current code uses reasonable default fields; if the Actor’s input schema changes, adjust the `input` objects in `server.js` accordingly.

---

### 4. Files of interest

- `server.js`
  - Express server
  - `runApifyActor` helper using Apify’s `run-sync-get-dataset-items` REST endpoint
  - `GET /api/search` and `GET /api/services` endpoints
  - Aggregation, deduplication, and basic curation logic

- `public/index.html`
  - Neutral, modern UI
  - Location entry + “Use my location”
  - Service filters
  - Tabs for **Providers** and **Events**
  - Client-side JS to call `/api/search` and render cards

- `public/styles.css`
  - Brand styling inspired by the **five elements** with soft neutrals

- `.env.example`
  - Template for `APIFY_TOKEN` and `PORT`

---

### 5. Notes & next steps

- **Respect platform terms**: When using Apify Actors against Google Maps / Instagram, ensure your use complies with their and Apify’s terms of service.
- **Event enrichment**: Right now, events are inferred primarily from Instagram content that contains future datetimes. You can plug in additional event-focused Actors or sources.
- **Persistence**: The app currently fetches fresh data per request; to build a true “Airbnb for holistic services”, you might add:
  - A database to cache / curate providers manually
  - User accounts, favourites, and reviews
  - An admin UI for deeper curation

If you tell me which directions you want to extend (e.g. user accounts, a specific location focus, more detailed event taxonomy), I can wire up the next layer for you.

