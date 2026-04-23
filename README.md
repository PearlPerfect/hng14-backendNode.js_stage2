# Intelligence Query Engine

A demographic intelligence REST API built for **Insighta Labs**. It stores 2026 demographic profiles enriched from three external APIs and exposes advanced filtering, sorting, pagination, and a rule-based natural language search endpoint.

Built with **Node.js**, **Express**, and **PostgreSQL (Neon)**.

---

## Live Demo

- **API Base URL:** `hhttps://hng14-backend-node-js-stage2.vercel.app/`
- **Interactive Docs:** `https://hng14-backend-node-js-stage2.vercel.app/` _(visit the root in a browser to test all endpoints live)_

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js v18+ | Async-first, widely supported |
| Framework | Express | Minimal, flexible routing |
| Database | PostgreSQL via `pg` | Relational, indexed queries, hosted on Neon |
| HTTP client | axios | External API calls (Genderize, Agify, Nationalize) |
| CORS | cors | Adds `Access-Control-Allow-Origin: *` |
| UUID | Custom uuidv7() | No ESM dependency issues on Vercel |

---

## Project Structure

```
intelligence-query-engine/
├── public/
│   └── index.html                  ← Interactive API docs (served at /)
├── src/
│   ├── config/
│   │   └── db.js                   ← PostgreSQL pool setup
│   ├── controllers/
│   │   └── profile.controller.js   ← HTTP request/response handling
│   ├── services/
│   │   ├── profile.service.js      ← DB queries, filtering, pagination
│   │   ├── nlp.service.js          ← Natural language parser
│   │   └── external.service.js     ← Genderize, Agify, Nationalize calls
│   ├── routes/
│   │   └── profile.routes.js       ← URL → controller mapping
│   ├── middleware/
│   │   └── errorHandler.js         ← Global error formatting
│   ├── utils/
│   │   ├── classify.js             ← Age group + top country helpers
│   │   └── uuidv7.js               ← UUID v7 generator (no external dep)
│   ├── scripts/
│   │   ├── seed.js                 ← Seeds 2026 profiles from JSON file
│   │   └── migrate.js              ← Adds missing columns + indexes
│   ├── app.js                      ← Express app, middleware, table init
│   └── server.js                   ← Entry point
├── .env
├── .gitignore
├── vercel.json
└── package.json
```

---

## Getting Started (Local)

### Prerequisites

- Node.js v18+
- A PostgreSQL database (free tier on [neon.tech](https://neon.tech) works perfectly)

### 1. Clone and install

```bash
git clone https://github.com/PearlPerfect/hng14-backendNode.js_stage2
cd hng14-backendNode.js_stage2
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```
PORT=3000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### 3. Run migration (if upgrading from Stage 1)

If your database already has a `profiles` table from Stage 1, run the migration first to add the `country_name` column and performance indexes:

```bash
npm run migrate
```

### 4. Seed the database

```bash
npm run seed
```

This downloads the 2026 profiles from the seed file and inserts them. Re-running is safe — it uses `ON CONFLICT (name) DO NOTHING` so no duplicates are created.

### 5. Start the server

```bash
npm run dev       # development (auto-restart with nodemon)
npm start         # production
```

Visit `http://localhost:3000` to open the interactive API docs.

---

## Database Schema

```sql
CREATE TABLE profiles (
  id                  TEXT PRIMARY KEY,
  name                VARCHAR NOT NULL UNIQUE,
  gender              VARCHAR,
  gender_probability  FLOAT,
  sample_size         INTEGER,
  age                 INTEGER,
  age_group           VARCHAR,
  country_id          VARCHAR(2),
  country_name        VARCHAR,
  country_probability FLOAT,
  created_at          TEXT NOT NULL
);

-- Performance indexes
CREATE INDEX idx_gender      ON profiles(gender);
CREATE INDEX idx_age_group   ON profiles(age_group);
CREATE INDEX idx_country_id  ON profiles(country_id);
CREATE INDEX idx_age         ON profiles(age);
CREATE INDEX idx_created_at  ON profiles(created_at);
```

### Field notes

| Field | Type | Notes |
|---|---|---|
| `id` | TEXT | UUID v7 — time-sortable, generated without external dependencies |
| `name` | VARCHAR | Unique — used for idempotency on POST |
| `gender` | VARCHAR | `"male"` or `"female"` from Genderize API |
| `gender_probability` | FLOAT | Confidence score 0–1 |
| `age` | INTEGER | Predicted age from Agify API |
| `age_group` | VARCHAR | Derived: `child` / `teenager` / `adult` / `senior` |
| `country_id` | VARCHAR(2) | ISO 3166-1 alpha-2 code (e.g. `NG`, `GH`) |
| `country_name` | VARCHAR | Full country name |
| `country_probability` | FLOAT | Confidence score 0–1 |
| `created_at` | TEXT | UTC ISO 8601 timestamp |

---

## API Reference

All responses use this envelope:

```json
{ "status": "success", "data": { ... } }
{ "status": "error",   "message": "..." }
```

All timestamps are **UTC ISO 8601**. All IDs are **UUID v7**.

---

### GET `/api/profiles`

Returns all profiles with optional filtering, sorting, and pagination.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | `male` or `female` (case-insensitive) |
| `age_group` | string | `child`, `teenager`, `adult`, or `senior` |
| `country_id` | string | ISO code e.g. `NG`, `GH` (case-insensitive) |
| `min_age` | number | Minimum age (inclusive) |
| `max_age` | number | Maximum age (inclusive) |
| `min_gender_probability` | number | Minimum gender confidence score (0–1) |
| `min_country_probability` | number | Minimum country confidence score (0–1) |
| `sort_by` | string | `age`, `created_at`, or `gender_probability` |
| `order` | string | `asc` or `desc` (default: `asc`) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`, max: `50`) |

All filters are combinable. Every condition must match.

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response (200):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 312,
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/profiles/search`

Parses a plain English query and converts it into structured filters. See the [Natural Language Parsing](#natural-language-parsing) section for full keyword documentation.

**Query parameters:**

| Parameter | Required | Description |
|---|---|---|
| `q` | Yes | Plain English search query |
| `page` | No | Page number (default: `1`) |
| `limit` | No | Results per page (default: `10`, max: `50`) |

**Example:**
```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

**Response (200):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 47,
  "data": [ ... ]
}
```

**Uninterpretable query (400):**
```json
{
  "status": "error",
  "message": "Unable to interpret query"
}
```

---

### GET `/api/profiles/:id`

Returns a single profile by UUID.

**Response (200):** Full profile object.

**Response (404):**
```json
{ "status": "error", "message": "Profile not found" }
```

---

### POST `/api/profiles`

Creates a new profile by calling Genderize, Agify, and Nationalize in parallel.

**Request body:**
```json
{ "name": "amara" }
```

**Response — created (201):**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "amara",
    "gender": "female",
    "gender_probability": 0.97,
    "age": 28,
    "age_group": "adult",
    "country_id": "GH",
    "country_name": "Ghana",
    "country_probability": 0.72,
    "created_at": "2026-04-18T10:00:00.000Z"
  }
}
```

**Response — already exists (200):**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { "...existing profile..." }
}
```

---

### DELETE `/api/profiles/:id`

Deletes a profile by UUID. Returns `204 No Content` on success.

---

## Error Reference

All errors follow this structure:
```json
{ "status": "error", "message": "<description>" }
```

| Status | Meaning |
|---|---|
| 400 | Missing or empty required parameter |
| 404 | Profile not found |
| 422 | Invalid parameter type |
| 502 | External API (Genderize / Agify / Nationalize) returned null or invalid data |
| 500 | Unexpected server error |

---

## Natural Language Parsing

### How it works

The `/api/profiles/search` endpoint uses a **rule-based parser** in `src/services/nlp.service.js`. It takes a plain English string, applies a series of regex patterns and keyword lookups in a fixed order, and converts matches into structured filter objects that are passed directly to the database query builder.

No AI, no LLMs, no external NLP libraries — just deterministic pattern matching.

**Parsing pipeline:**

1. Lowercase and trim the input
2. Detect gender keywords
3. Detect age group keywords (`teenager`, `adult`, etc.)
4. If `"young"` is present and no age group was matched, set `min_age=16, max_age=24`
5. Detect explicit age expressions (`above N`, `under N`, `between N and M`)
6. Scan for country names using a longest-match lookup table (multi-word names like `"south africa"` are checked before single-word names)
7. If no country name matched, attempt a 2-letter ISO code match (`from NG`, `in US`)
8. If the resulting filter object is empty, return `null` → the controller responds with `"Unable to interpret query"`

---

### Supported keywords

#### Gender

| Input contains | Resolves to |
|---|---|
| `male`, `males`, `man`, `men` | `gender=male` |
| `female`, `females`, `woman`, `women` | `gender=female` |
| both male and female terms | no gender filter applied |

#### Age groups

| Input contains | Resolves to |
|---|---|
| `child`, `children`, `kids`, `kid` | `age_group=child` |
| `teenager`, `teenagers`, `teen`, `teens` | `age_group=teenager` |
| `adult`, `adults` | `age_group=adult` |
| `senior`, `seniors`, `elderly`, `old people` | `age_group=senior` |

#### Age expressions

| Pattern | Example | Resolves to |
|---|---|---|
| `young` (no age group matched) | "young males" | `min_age=16, max_age=24` |
| `above N` / `over N` / `older than N` | "females above 30" | `min_age=30` |
| `below N` / `under N` / `younger than N` | "males under 25" | `max_age=25` |
| `between N and M` | "people between 20 and 35" | `min_age=20, max_age=35` |
| `aged N` / `age N` | "women aged 28" | `min_age=28, max_age=28` |

#### Country names (sample)

The parser includes a lookup table of 80+ country names mapped to ISO codes. Longest match wins, so `"south africa"` is matched before `"africa"`.

| Input | Resolves to |
|---|---|
| `nigeria` | `NG` |
| `ghana` | `GH` |
| `kenya` | `KE` |
| `south africa` | `ZA` |
| `egypt` | `EG` |
| `angola` | `AO` |
| `ivory coast` / `côte d'ivoire` | `CI` |
| `democratic republic of congo` / `drc` | `CD` |
| `united states` / `usa` | `US` |
| `united kingdom` / `uk` | `GB` |
| 2-letter ISO after `from`/`in` | matched directly |

---

### Example query mappings

| Query | Parsed filters |
|---|---|
| `young males from nigeria` | `gender=male, min_age=16, max_age=24, country_id=NG` |
| `females above 30` | `gender=female, min_age=30` |
| `people from angola` | `country_id=AO` |
| `adult males from kenya` | `gender=male, age_group=adult, country_id=KE` |
| `male and female teenagers above 17` | `age_group=teenager, min_age=17` |
| `senior females` | `gender=female, age_group=senior` |
| `males between 20 and 35` | `gender=male, min_age=20, max_age=35` |
| `children from ghana` | `age_group=child, country_id=GH` |
| `elderly people from egypt` | `age_group=senior, country_id=EG` |
| `females under 25` | `gender=female, max_age=25` |

---

### Limitations

The parser is intentionally simple and rule-based. The following are known gaps:

**Gender**
- Handles singular/plural of `male`/`female` but not all synonyms (e.g. `"guys"`, `"ladies"`, `"boys"`, `"girls"` are not mapped)
- Gender detection is keyword-presence based — it does not understand sentence structure, so unusual phrasing like `"not male"` or `"excluding females"` will not work as expected

**Age**
- `"young"` is hardcoded to ages 16–24 for parsing purposes only — it is not a stored `age_group`
- `"middle-aged"` and `"old"` are not mapped
- Ordinal phrasing like `"people in their 30s"` or `"late 20s"` is not supported
- When both a `"young"` keyword and an explicit `"above N"` appear together, the explicit range overrides `"young"`'s max_age but not min_age — edge cases with conflicting ranges are not resolved

**Countries**
- Only the 80+ countries in the lookup table are supported by name — countries not in the table will only match if the user writes their exact 2-letter ISO code after `"from"` or `"in"`
- Country name variations and alternate spellings (e.g. `"ivory coast"` vs `"cote d'ivoire"`) are mapped where known, but not exhaustively
- Adjective forms are not supported (`"Nigerian"` will not match `NG`)
- Multi-country queries like `"from nigeria or ghana"` are not supported — only the first matched country is used

**General**
- Negation is not supported (`"not from nigeria"`, `"excluding adults"`)
- OR logic is not supported — all parsed filters are combined with AND
- Typos and misspellings are not corrected
- Queries that contain only stopwords (`"people"`, `"show me"`, `"find"`) without any matchable keyword return `"Unable to interpret query"`
- The parser does not understand relative terms like `"recently added"` or `"most common"`

---

## Deployment (Vercel + Neon)

### vercel.json

```json
{
  "version": 2,
  "builds": [
    { "src": "src/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "src/server.js" }
  ]
}
```

### Steps

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `DATABASE_URL` in **Settings → Environment Variables**
4. Deploy — Vercel auto-detects Node.js and runs `npm start`
5. Run the seed against your production database:
   ```bash
   npm run seed
   ```

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | Server port (Vercel sets this automatically) |
| `DATABASE_URL` | Full PostgreSQL connection string from Neon |

---

## Scripts

```bash
npm run dev      # Start with nodemon (auto-restart)
npm start        # Start in production mode
npm run seed     # Seed 2026 profiles into the database
npm run migrate  # Add missing columns and indexes to existing table
```

---

## Testing

### Using the interactive docs

Visit `http://localhost:3000` (or your deployed URL) in a browser. Every endpoint has live input fields, real response panels, syntax-highlighted JSON, latency indicators, and a one-click env switcher between local and production.

### Using curl

```bash
# All profiles, page 1
curl "http://localhost:3000/api/profiles?page=1&limit=10"

# Filter: adult males from Nigeria, sorted by age descending
curl "http://localhost:3000/api/profiles?gender=male&country_id=NG&age_group=adult&sort_by=age&order=desc"

# Filter: age range
curl "http://localhost:3000/api/profiles?min_age=20&max_age=30"

# Filter: high confidence scores
curl "http://localhost:3000/api/profiles?min_gender_probability=0.9&min_country_probability=0.8"

# Natural language search
curl "http://localhost:3000/api/profiles/search?q=young+males+from+nigeria"
curl "http://localhost:3000/api/profiles/search?q=females+above+30"
curl "http://localhost:3000/api/profiles/search?q=adult+males+from+kenya"
curl "http://localhost:3000/api/profiles/search?q=teenagers+from+ghana"
curl "http://localhost:3000/api/profiles/search?q=male+and+female+teenagers+above+17"

# Uninterpretable query (should return 400)
curl "http://localhost:3000/api/profiles/search?q=hello+world"

# Get single profile
curl "http://localhost:3000/api/profiles/YOUR_UUID_HERE"

# Create a profile
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "amara"}'

# Delete a profile
curl -X DELETE http://localhost:3000/api/profiles/YOUR_UUID_HERE
```

---

## License

MIT