"""OpenWeather client.

Tries One Call 3.0 (hourly + daily + UV + official alerts) and falls back to the free
2.5 endpoints (current weather + 5-day/3-hour forecast) when the key is not subscribed
to One Call. Fields the free plan does not provide (UV index, official alerts) are
reported as unavailable rather than invented.
"""

from __future__ import annotations

import time
from collections import Counter, defaultdict

import httpx

from ..config import settings
from ..schemas import (
    Condition,
    CurrentWeather,
    DailyForecast,
    HourlySlot,
    Location,
    OfficialAlert,
    WeatherBundle,
    WeatherMeta,
)
from .errors import WeatherProviderError
from .timeutil import compass, date_label, local_dt

BASE = "https://api.openweathermap.org"
TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class _OneCallState:
    """Remembers whether the configured key can use One Call 3.0 so we don't retry it on every request."""

    available: bool | None = None
    checked_at: float = 0.0


_onecall = _OneCallState()


def _condition(raw: list[dict] | None) -> Condition:
    w = (raw or [{}])[0]
    return Condition(
        id=int(w.get("id", 800)),
        main=w.get("main", "Clear"),
        description=w.get("description", "clear sky"),
        icon=w.get("icon", "01d"),
    )


def _kmh(ms: float | None) -> float:
    return round((ms or 0.0) * 3.6, 1)


def _vis(meters: float | None) -> float | None:
    return None if meters is None else round(meters / 1000, 1)


async def _get(client: httpx.AsyncClient, path: str, params: dict) -> httpx.Response:
    try:
        return await client.get(f"{BASE}{path}", params={**params, "appid": settings.openweather_api_key})
    except httpx.TimeoutException as exc:
        raise WeatherProviderError("The weather service timed out. Please try again.", 504, "timeout") from exc
    except httpx.HTTPError as exc:
        raise WeatherProviderError("Could not reach the weather service.", 502, "network") from exc


def _raise_for(resp: httpx.Response) -> None:
    if resp.status_code == 200:
        return
    if resp.status_code == 401:
        raise WeatherProviderError(
            "OpenWeather rejected the API key. New keys can take up to 2 hours to activate.", 502, "invalid_key"
        )
    if resp.status_code == 404:
        raise WeatherProviderError("Location not found by the weather service.", 404, "not_found")
    if resp.status_code == 429:
        raise WeatherProviderError("Weather service rate limit reached. Try again in a minute.", 503, "rate_limited")
    raise WeatherProviderError(f"Weather service error ({resp.status_code}).", 502, "provider_error")


# ---------------------------------------------------------------- geocoding


async def geocode(query: str, limit: int = 6) -> list[Location]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get(client, "/geo/1.0/direct", {"q": query, "limit": limit})
        _raise_for(resp)
        return _dedupe([_loc(item) for item in resp.json()])


async def reverse_geocode(lat: float, lon: float) -> Location:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await _get(client, "/geo/1.0/reverse", {"lat": lat, "lon": lon, "limit": 1})
        _raise_for(resp)
        items = resp.json()
    if not items:
        return Location(name="Current location", lat=lat, lon=lon)
    loc = _loc(items[0])
    return loc.model_copy(update={"lat": lat, "lon": lon})


def _loc(item: dict) -> Location:
    names = item.get("local_names") or {}
    return Location(
        name=names.get("en") or item.get("name", "Unknown"),
        state=item.get("state"),
        country=item.get("country"),
        lat=round(item["lat"], 4),
        lon=round(item["lon"], 4),
    )


def _dedupe(locs: list[Location]) -> list[Location]:
    seen, out = set(), []
    for loc in locs:
        key = (loc.name, loc.state, loc.country)
        if key not in seen:
            seen.add(key)
            out.append(loc)
    return out


# ---------------------------------------------------------------- weather


async def fetch_weather(location: Location) -> WeatherBundle:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        if _should_try_onecall():
            resp = await _get(
                client,
                "/data/3.0/onecall",
                {"lat": location.lat, "lon": location.lon, "units": "metric", "exclude": "minutely"},
            )
            if resp.status_code == 200:
                _onecall.available = True
                return _from_onecall(location, resp.json())
            if resp.status_code in (401, 403):
                # Key exists but has no One Call subscription → use free endpoints.
                _onecall.available = False
                _onecall.checked_at = time.time()
            else:
                _raise_for(resp)
        return await _fetch_free(client, location)


def _should_try_onecall() -> bool:
    if settings.onecall_mode in {"false", "0", "off", "no"}:
        return False
    if settings.onecall_mode in {"true", "1", "on", "yes"}:
        return True
    # auto: re-check at most every 6 hours after a failure
    return _onecall.available is not False or time.time() - _onecall.checked_at > 6 * 3600


def _from_onecall(location: Location, data: dict) -> WeatherBundle:
    tz = int(data.get("timezone_offset", 0))
    cur = data["current"]
    current = CurrentWeather(
        dt=cur["dt"],
        temp=round(cur["temp"], 1),
        feels_like=round(cur["feels_like"], 1),
        humidity=int(cur["humidity"]),
        wind_kmh=_kmh(cur.get("wind_speed")),
        wind_deg=cur.get("wind_deg"),
        wind_dir=compass(cur.get("wind_deg")),
        uvi=cur.get("uvi"),
        visibility_km=_vis(cur.get("visibility")),
        pressure=cur.get("pressure"),
        clouds=cur.get("clouds"),
        condition=_condition(cur.get("weather")),
        is_day=_condition(cur.get("weather")).icon.endswith("d"),
        sunrise=cur.get("sunrise"),
        sunset=cur.get("sunset"),
    )
    hourly = []
    for i, h in enumerate(data.get("hourly", [])[:48]):
        cond = _condition(h.get("weather"))
        hourly.append(
            HourlySlot(
                dt=h["dt"],
                slot_hours=1,
                temp=round(h["temp"], 1),
                feels_like=round(h["feels_like"], 1),
                humidity=int(h["humidity"]),
                wind_kmh=_kmh(h.get("wind_speed")),
                wind_deg=h.get("wind_deg"),
                pop=h.get("pop"),
                rain_mm=(h.get("rain") or {}).get("1h", 0.0),
                snow_mm=(h.get("snow") or {}).get("1h", 0.0),
                visibility_km=_vis(h.get("visibility")),
                uvi=h.get("uvi"),
                clouds=h.get("clouds"),
                condition=cond,
                is_day=cond.icon.endswith("d"),
                is_now=i == 0,
            )
        )
    daily = [
        DailyForecast(
            dt=d["dt"],
            date_label=date_label(d["dt"], tz),
            temp_min=round(d["temp"]["min"], 1),
            temp_max=round(d["temp"]["max"], 1),
            pop=d.get("pop"),
            rain_mm=d.get("rain", 0.0) or 0.0,
            uvi=d.get("uvi"),
            condition=_condition(d.get("weather")),
            sunrise=d.get("sunrise"),
            sunset=d.get("sunset"),
        )
        for d in data.get("daily", [])
    ]
    alerts = [
        OfficialAlert(
            sender=a.get("sender_name", "National weather service"),
            event=a.get("event", "Weather alert"),
            start=a.get("start", 0),
            end=a.get("end", 0),
            description=(a.get("description") or "")[:600],
        )
        for a in data.get("alerts", []) or []
    ]
    return WeatherBundle(
        location=location,
        current=current,
        hourly=hourly,
        daily=daily,
        alerts=alerts,
        meta=WeatherMeta(
            source="live",
            provider="OpenWeather",
            plan="One Call 3.0",
            fetched_at=int(time.time()),
            tz_offset=tz,
            notes=["Official alerts are shown only when issued by a national weather agency via OpenWeather."],
        ),
    )


async def _fetch_free(client: httpx.AsyncClient, location: Location) -> WeatherBundle:
    params = {"lat": location.lat, "lon": location.lon, "units": "metric"}
    cur_resp = await _get(client, "/data/2.5/weather", params)
    _raise_for(cur_resp)
    fc_resp = await _get(client, "/data/2.5/forecast", params)
    _raise_for(fc_resp)
    cur, fc = cur_resp.json(), fc_resp.json()

    tz = int(cur.get("timezone", fc.get("city", {}).get("timezone", 0)))
    cond = _condition(cur.get("weather"))
    current = CurrentWeather(
        dt=cur["dt"],
        temp=round(cur["main"]["temp"], 1),
        feels_like=round(cur["main"]["feels_like"], 1),
        humidity=int(cur["main"]["humidity"]),
        wind_kmh=_kmh(cur.get("wind", {}).get("speed")),
        wind_deg=cur.get("wind", {}).get("deg"),
        wind_dir=compass(cur.get("wind", {}).get("deg")),
        uvi=None,
        visibility_km=_vis(cur.get("visibility")),
        pressure=cur["main"].get("pressure"),
        clouds=cur.get("clouds", {}).get("all"),
        condition=cond,
        is_day=cond.icon.endswith("d"),
        sunrise=cur.get("sys", {}).get("sunrise"),
        sunset=cur.get("sys", {}).get("sunset"),
    )

    items = fc.get("list", [])
    # The current-conditions reading becomes the "Now" slot; it has no precipitation probability,
    # so it borrows the probability of the forecast slot it falls inside.
    first_pop = items[0].get("pop") if items else None
    hourly = [
        HourlySlot(
            dt=current.dt,
            slot_hours=1,
            temp=current.temp,
            feels_like=current.feels_like,
            humidity=current.humidity,
            wind_kmh=current.wind_kmh,
            wind_deg=current.wind_deg,
            pop=first_pop,
            rain_mm=(cur.get("rain") or {}).get("1h", 0.0),
            visibility_km=current.visibility_km,
            clouds=current.clouds,
            condition=cond,
            is_day=current.is_day,
            is_now=True,
        )
    ]
    for item in items[:16]:
        c = _condition(item.get("weather"))
        hourly.append(
            HourlySlot(
                dt=item["dt"],
                slot_hours=3,
                temp=round(item["main"]["temp"], 1),
                feels_like=round(item["main"]["feels_like"], 1),
                humidity=int(item["main"]["humidity"]),
                wind_kmh=_kmh(item.get("wind", {}).get("speed")),
                wind_deg=item.get("wind", {}).get("deg"),
                pop=item.get("pop"),
                rain_mm=(item.get("rain") or {}).get("3h", 0.0),
                snow_mm=(item.get("snow") or {}).get("3h", 0.0),
                visibility_km=_vis(item.get("visibility")),
                clouds=item.get("clouds", {}).get("all"),
                condition=c,
                is_day=item.get("sys", {}).get("pod", c.icon[-1]) == "d",
            )
        )

    return WeatherBundle(
        location=location,
        current=current,
        hourly=hourly,
        daily=_aggregate_daily(items, tz),
        alerts=[],
        meta=WeatherMeta(
            source="live",
            provider="OpenWeather",
            plan="Free (Current + 5-day / 3-hour forecast)",
            fetched_at=int(time.time()),
            tz_offset=tz,
            unavailable=["uvi", "official_alerts"],
            notes=[
                "Forecast is in 3-hour steps on the free OpenWeather plan.",
                "UV index and official alerts require an OpenWeather One Call 3.0 subscription.",
            ],
        ),
    )


def _aggregate_daily(items: list[dict], tz: int) -> list[DailyForecast]:
    by_day: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        by_day[local_dt(item["dt"], tz).strftime("%Y-%m-%d")].append(item)
    out = []
    for _, slots in sorted(by_day.items()):
        temps = [s["main"]["temp"] for s in slots]
        midday = [s for s in slots if 9 <= local_dt(s["dt"], tz).hour <= 15] or slots
        common_id = Counter(s["weather"][0]["id"] for s in midday).most_common(1)[0][0]
        rep = next(s for s in midday if s["weather"][0]["id"] == common_id)
        out.append(
            DailyForecast(
                dt=slots[0]["dt"],
                date_label=date_label(slots[0]["dt"], tz),
                temp_min=round(min(temps), 1),
                temp_max=round(max(temps), 1),
                pop=max((s.get("pop") or 0.0) for s in slots),
                rain_mm=round(sum((s.get("rain") or {}).get("3h", 0.0) for s in slots), 1),
                condition=_condition(rep.get("weather")),
                derived=True,
            )
        )
    return out
