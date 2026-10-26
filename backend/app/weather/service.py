"""Single entry point for weather data: picks live or demo provider and caches results."""

from __future__ import annotations

import time

from ..config import settings
from ..schemas import Location, WeatherBundle
from . import demo, openweather

_cache: dict[tuple[float, float], tuple[float, WeatherBundle]] = {}
_MAX_ENTRIES = 256


def _key(lat: float, lon: float) -> tuple[float, float]:
    return round(lat, 2), round(lon, 2)


async def get_weather(location: Location, force_refresh: bool = False) -> WeatherBundle:
    if settings.demo_mode:
        return demo.build(location)

    key = _key(location.lat, location.lon)
    hit = _cache.get(key)
    if hit and not force_refresh and time.time() - hit[0] < settings.cache_ttl_seconds:
        return hit[1].model_copy(update={"location": location})

    bundle = await openweather.fetch_weather(location)
    if len(_cache) >= _MAX_ENTRIES:
        _cache.pop(min(_cache, key=lambda k: _cache[k][0]))
    _cache[key] = (time.time(), bundle)
    return bundle


async def search_locations(query: str) -> list[Location]:
    if settings.demo_mode:
        return demo.search(query)
    return await openweather.geocode(query)


async def reverse_location(lat: float, lon: float) -> Location:
    if settings.demo_mode:
        s = demo.nearest(lat, lon)
        return s.location
    return await openweather.reverse_geocode(lat, lon)
