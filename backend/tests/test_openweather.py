"""OpenWeather client tests with the HTTP layer mocked — no network or key needed."""

import asyncio
import dataclasses
import time

import httpx

from app.schemas import Location
from app.weather import openweather

NOW = int(time.time())


def _current():
    return {
        "dt": NOW, "timezone": 19800,
        "weather": [{"id": 802, "main": "Clouds", "description": "scattered clouds", "icon": "03d"}],
        "main": {"temp": 29.2, "feels_like": 31.0, "humidity": 68, "pressure": 1008},
        "wind": {"speed": 3.9, "deg": 315}, "visibility": 8000, "clouds": {"all": 40},
        "sys": {"sunrise": NOW - 3600, "sunset": NOW + 8 * 3600},
    }


def _forecast():
    items = []
    for i in range(16):
        items.append({
            "dt": NOW + (i + 1) * 3 * 3600,
            "main": {"temp": 28 + i % 3, "feels_like": 30, "humidity": 60},
            "weather": [{"id": 500, "main": "Rain", "description": "light rain", "icon": "10n"}],
            "wind": {"speed": 4, "deg": 300}, "visibility": 10000, "pop": 0.6,
            "rain": {"3h": 1.2}, "clouds": {"all": 80}, "sys": {"pod": "n"},
        })
    return {"list": items, "city": {"timezone": 19800}}


def _transport(onecall_status: int):
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("/data/3.0/onecall"):
            return httpx.Response(onecall_status, json={"cod": onecall_status, "message": "no subscription"})
        if path.endswith("/data/2.5/weather"):
            return httpx.Response(200, json=_current())
        if path.endswith("/data/2.5/forecast"):
            return httpx.Response(200, json=_forecast())
        return httpx.Response(404)

    return httpx.MockTransport(handler)


def test_falls_back_to_free_plan_and_marks_uv_unavailable(monkeypatch):
    transport = _transport(401)
    real = httpx.AsyncClient
    monkeypatch.setattr(openweather.httpx, "AsyncClient", lambda **kw: real(transport=transport, **kw))
    monkeypatch.setattr(openweather, "settings", dataclasses.replace(openweather.settings, openweather_api_key="test"))
    openweather._onecall.available = None

    b = asyncio.run(openweather.fetch_weather(Location(name="Chandigarh", lat=30.73, lon=76.78)))
    assert b.meta.source == "live"
    assert "uvi" in b.meta.unavailable
    assert b.current.uvi is None
    assert b.current.wind_kmh == 14.0 and b.current.wind_dir == "NW"
    assert b.current.visibility_km == 8.0
    assert b.hourly[0].is_now and b.hourly[0].pop == 0.6
    assert b.hourly[1].slot_hours == 3
    assert b.daily and b.daily[0].derived
    assert openweather._onecall.available is False
