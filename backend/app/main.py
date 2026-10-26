"""Mausam AI API.

Endpoints
  GET  /api/health                     — mode (live/demo) and provider info
  GET  /api/geocode?q=                 — city search
  GET  /api/geocode/reverse?lat&lon    — name for browser geolocation
  GET  /api/weather?lat&lon&name       — normalized current + hourly + daily weather
  POST /api/recommendations            — activity windows, suitability, advisories
  POST /api/planner                    — destination planner cards and insights

If the built frontend exists (frontend/dist), it is served from "/" so the whole
app can be deployed as a single service.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .engine import rules
from .engine.planner import build_plan
from .engine.recommend import build_recommendations
from .schemas import Location, LocationQuery, PlannerRequest, RecommendationRequest, WeatherBundle
from .weather import service
from .weather.errors import WeatherProviderError

app = FastAPI(title="Mausam AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------- rate limiting
# Small in-memory sliding window per client IP; protects the OpenWeather quota on public deploys.
_hits: dict[str, deque] = defaultdict(deque)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api/") and settings.rate_limit_per_minute > 0:
        ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0]
        now = time.time()
        q = _hits[ip]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= settings.rate_limit_per_minute:
            return JSONResponse(
                {"error": {"code": "rate_limited", "message": "Too many requests. Please wait a moment."}}, 429
            )
        q.append(now)
    return await call_next(request)


@app.exception_handler(WeatherProviderError)
async def provider_error(_: Request, exc: WeatherProviderError):
    return JSONResponse({"error": {"code": exc.code, "message": exc.message}}, status_code=exc.status)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"error": {"code": "bad_request", "message": str(exc.detail)}}, status_code=exc.status_code)


# ---------------------------------------------------------------- routes


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "mode": "demo" if settings.demo_mode else "live",
        "provider": "Mausam AI sample data" if settings.demo_mode else "OpenWeather",
        "rules_version": rules.RULES_VERSION,
        "message": "No OPENWEATHER_API_KEY configured — serving labelled sample data."
        if settings.demo_mode
        else "Live weather from OpenWeather.",
    }


@app.get("/api/geocode", response_model=list[Location])
async def geocode(q: str = Query(..., min_length=2, max_length=80)):
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Search query must be at least 2 characters.")
    return await service.search_locations(query)


@app.get("/api/geocode/reverse", response_model=Location)
async def reverse(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    return await service.reverse_location(lat, lon)


def _location(q: LocationQuery) -> Location:
    return Location(name=(q.name or "Selected location").strip(), state=q.state, country=q.country, lat=q.lat, lon=q.lon)


@app.get("/api/weather", response_model=WeatherBundle)
async def weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None, max_length=80),
    state: str | None = Query(None, max_length=80),
    country: str | None = Query(None, max_length=8),
    refresh: bool = False,
):
    loc = _location(LocationQuery(lat=lat, lon=lon, name=name, state=state, country=country))
    return await service.get_weather(loc, force_refresh=refresh)


@app.post("/api/recommendations")
async def recommendations(body: RecommendationRequest):
    bundle = await service.get_weather(_location(body))
    return build_recommendations(bundle, body.preferences)


@app.post("/api/planner")
async def planner(body: PlannerRequest):
    bundle = await service.get_weather(_location(body))
    return await build_plan(bundle, body.preferences)


@app.get("/api/{rest:path}", include_in_schema=False)
async def api_not_found(rest: str):
    return JSONResponse({"error": {"code": "not_found", "message": f"Unknown endpoint /api/{rest}"}}, 404)


# ---------------------------------------------------------------- static frontend (single-service deploys)

if settings.frontend_dist.is_dir():
    index = settings.frontend_dist / "index.html"
    app.mount("/assets", StaticFiles(directory=settings.frontend_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        candidate = (settings.frontend_dist / path).resolve()
        if path and candidate.is_file() and settings.frontend_dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(index)
