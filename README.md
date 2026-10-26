# Mausam AI — Personalized Weather Intelligence

Mausam AI turns a weather forecast into plans you can act on: the best outdoor window for your
workout, how suitable today is for travel, gardening or a family outing, and when to visit a
city's monuments and viewpoints.

- **Weather Dashboard** (default: Chandigarh): current conditions, an AI recommendation, an hourly forecast with a temperature trend, activity suitability and smart alerts.
- **Destination Planner** (default: New Delhi): monument and viewpoint cards with best visiting times, indoor alternatives, driving-route weather and attraction accessibility.
- **Detailed Forecast**, **Itinerary** and **Preferences**, all working and saved on the device.

Frontend: React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide. Backend: FastAPI + httpx. Weather data: OpenWeather.

---

## Quick start (local)

Requires **Python 3.11+** and **Node 20.19+ / 22+**.

```bash
# 1. Backend  (terminal 1)
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                 # then paste your OpenWeather key into .env (optional)
uvicorn app.main:app --reload --port 8000

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                          # http://localhost:5173  (proxies /api → :8000)
```

**No API key?** The app still runs in **Demo mode**. A banner on every screen says the
data is generated sample data, not live weather, and the API reports `"source": "demo"`.

### Run the whole app on one port (like production)

```bash
cd frontend && npm run build && cd ..
backend/.venv/bin/uvicorn app.main:app --app-dir backend --port 8000   # http://localhost:8000
```

Or with Docker: `docker build -t mausam-ai . && docker run -p 8000:8000 -e OPENWEATHER_API_KEY=xxx mausam-ai`

### Tests

```bash
cd backend && python -m pytest -q        # API, engine rules, OpenWeather fallback (mocked HTTP)
cd frontend && npm run build             # type-check + production build
```

---

## Environment variables

Backend: `backend/.env` locally, or the host's dashboard in production. **Never commit `.env`**; it is git-ignored.

| Variable | Default | Purpose |
|---|---|---|
| `OPENWEATHER_API_KEY` | *(empty → demo mode)* | Key from <https://home.openweathermap.org/api_keys>. New keys can take up to 2 hours to activate. |
| `OPENWEATHER_ONECALL` | `auto` | `auto` tries One Call 3.0 (hourly data, UV, official alerts) and falls back to the free 2.5 endpoints. `false` always uses the free endpoints. |
| `DEMO_MODE` | `false` | Force sample data even when a key is set. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,…` | CORS origins allowed to call the API. Add your GitHub Pages URL if you use it. |
| `WEATHER_CACHE_TTL` | `600` | Seconds to cache weather per location (saves API quota). |
| `RATE_LIMIT_PER_MINUTE` | `90` | Per-IP limit on `/api/*`; `0` disables it. |

Frontend (build time, **public**, so never put secrets here):

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Only when the frontend is hosted separately from the API, e.g. `https://mausam-ai-htrr.onrender.com`. |
| `VITE_BASE` | Base path for the build, e.g. `/mausam-ai/` on GitHub Pages. Defaults to `/`. |

The API key is only ever read by the backend. The browser calls `/api/*` and never sees the key.

---

## Deploying with GitHub

```bash
git clone https://github.com/Optimus2007/mausam-ai.git
```

**CI** (`.github/workflows/ci.yml`) runs the backend tests and the frontend build on every push and pull request.

### Live setup: frontend on GitHub Pages + API on Render

GitHub Pages only serves static files, so the FastAPI backend (which holds the OpenWeather key) runs on Render's free tier.

1. **Backend:** at <https://dashboard.render.com/blueprints>, choose **New Blueprint Instance** and pick this repo. `render.yaml` builds the `Dockerfile` and redeploys on every push to `main`. The service starts in labelled demo mode.
2. **Weather key:** in Render, open **mausam-ai → Environment** and add `OPENWEATHER_API_KEY`. The service restarts and switches to live weather.
3. **Frontend:** in GitHub, go to **Settings → Pages → Source** and choose **GitHub Actions**. `.github/workflows/pages.yml` publishes `https://optimus2007.github.io/mausam-ai/` on every push and calls the API at `https://mausam-ai-htrr.onrender.com`. To use a different URL, set the repository variable `VITE_API_BASE_URL`.

On the free tier the API sleeps when idle. The first request can take about 50 seconds, and the UI shows a "waking up" message while it waits.

The app uses hash routing (`/#/planner`), so deep links work on Pages without any server rewrites.

---

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Mode (`live` / `demo`), provider, rules version |
| GET | `/api/geocode?q=jaipur` | City search (2–80 chars) |
| GET | `/api/geocode/reverse?lat=&lon=` | Name for the browser's current location |
| GET | `/api/weather?lat=&lon=&name=&refresh=` | Normalized current, hourly and daily weather, alerts, and `meta` (source, plan, unavailable fields) |
| POST | `/api/recommendations` | `{lat, lon, name, preferences}` returns the focus window, activity suitability and advisories |
| POST | `/api/planner` | `{lat, lon, name, preferences}` returns monument/viewpoint cards, indoor alternatives, route weather and accessibility |

Inputs are validated: coordinates are range-checked and activity and time values are enums. Errors come back as
`{"error": {"code", "message"}}` with codes `invalid_key`, `rate_limited`, `timeout`, `network` and `not_found`.
Interactive docs are at `/docs`.

---

## How recommendations work

The recommendations come from rules you can read and change, not an LLM.

- `backend/app/engine/rules.py` holds every threshold: heat (feels-like 35 °C caution, 41 °C danger), rain probability (50 %), wind (30 / 50 km/h), UV (6 / 8), visibility (2 km / 1 km fog), plus a scoring profile per activity.
- `scoring.py` scores every forecast hour from 0 to 100 for an activity and records each penalty as a readable reason, such as "feels like 38°C" or "UV index 9".
- `recommend.py` finds the best window (a contiguous run of hours scoring 65+, looking in your preferred times first), computes suitability, and generates advisories. Each advisory states its basis, e.g. "Up to 70% chance of rain (alert threshold 50%)".
- `planner.py` and `destinations.py` build the destination plan. The catalog lists which places are open-air or indoor and which driving route to check for New Delhi, Chandigarh, Jaipur, Mumbai and Agra. Other cities get a generic plan from their own forecast.

**What the app does not claim:**

- Forecast values come from OpenWeather. Scores, windows and risk labels are labelled as Mausam AI recommendations.
- "Official alert" banners appear only when OpenWeather One Call returns alerts from a national agency. Everything else is a forecast-based advisory and says so.
- Missing data shows as "—" or "N/A on plan" and is never filled in. On the free plan that means no UV index, no official alerts, and 3-hour forecast steps. The engine skips rules whose data is missing.
- Accessibility predictions are based on weather only. They say to check official timings and closures.

---

## Project structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes, CORS, rate limit, serves built frontend
│   │   ├── config.py            # env-based settings
│   │   ├── schemas.py           # normalized weather + request models
│   │   ├── weather/
│   │   │   ├── openweather.py   # One Call 3.0 → free 2.5 fallback, geocoding
│   │   │   ├── demo.py          # labelled sample data (demo mode)
│   │   │   ├── service.py       # provider selection + TTL cache
│   │   │   └── timeutil.py
│   │   └── engine/
│   │       ├── rules.py         # ← all thresholds & activity profiles
│   │       ├── scoring.py       # per-hour scores with reasons
│   │       ├── recommend.py     # windows, suitability, advisories
│   │       ├── planner.py       # destination planner + route/accessibility
│   │       └── destinations.py  # curated place catalog
│   ├── tests/
│   ├── requirements.txt / requirements-dev.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # typed client + response types
│   │   ├── state/AppState.tsx   # prefs, locations, itinerary, dismissed alerts (localStorage)
│   │   ├── hooks/               # useAsync (loading/refresh/slow/abort), useLocalStorage
│   │   ├── components/
│   │   │   ├── weather/         # CurrentWeatherCard, HourlyForecast (+ chart), WeatherGlyph
│   │   │   ├── recommendations/ # AIRecommendationCard, ActivitySuitability, Alerts
│   │   │   ├── planner/         # PlannerCard, Route/Accessibility cards, detail sheets
│   │   │   ├── sheets/          # Location search, Preferences, Menu
│   │   │   ├── layout/          # Header, BottomNav
│   │   │   ├── illustrations/   # inline SVG landmarks & scenes
│   │   │   └── common/          # Sheet, states (loading/empty/error), toasts
│   │   └── pages/               # Dashboard, Planner, Forecast, Itinerary
│   └── vite.config.ts
├── Dockerfile                   # single-service image
├── render.yaml                  # Render blueprint (deploy from GitHub)
└── .github/workflows/           # ci.yml, pages.yml
```

## Data stored in the browser

Preferences, chosen locations, itinerary and dismissed alerts are stored in `localStorage` on the user's device. No API keys or personal data are stored there.
