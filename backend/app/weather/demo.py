"""Clearly-labelled SAMPLE weather used when no OpenWeather API key is configured.

These values are generated from simple per-city scenarios so the UI and the
recommendation engine can be demonstrated end to end. They are not observations
and every response built from them carries `meta.source = "demo"`.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field

from ..schemas import (
    Condition,
    CurrentWeather,
    DailyForecast,
    HourlySlot,
    Location,
    WeatherBundle,
    WeatherMeta,
)
from .timeutil import compass, date_label, local_hour

IST = 19800


@dataclass(frozen=True)
class Scenario:
    location: Location
    tz: int
    tmin: float
    tmax: float
    humidity: int
    wind: float
    wind_deg: int
    uv_max: float
    clouds_id: int = 802
    rain_hours: tuple[int, ...] = ()
    rain_pop: float = 0.7
    fog_hours: tuple[int, ...] = ()
    base_pop: float = 0.05
    visibility: float = 8.0
    aliases: tuple[str, ...] = field(default_factory=tuple)


def _loc(name: str, state: str, country: str, lat: float, lon: float) -> Location:
    return Location(name=name, state=state, country=country, lat=lat, lon=lon)


SCENARIOS: list[Scenario] = [
    Scenario(_loc("Chandigarh", "Chandigarh", "IN", 30.7333, 76.7794), IST, 22, 31, 64, 14, 315, 7,
             rain_hours=(21, 22, 23), rain_pop=0.7),
    Scenario(_loc("New Delhi", "Delhi", "IN", 28.6139, 77.2090), IST, 21, 37, 40, 9, 270, 9, clouds_id=803,
             fog_hours=(5, 6, 7), base_pop=0.2, visibility=6.0, aliases=("delhi",)),
    Scenario(_loc("Mumbai", "Maharashtra", "IN", 19.0760, 72.8777), IST, 26, 31, 78, 18, 260, 8, clouds_id=803,
             rain_hours=(14, 15, 16, 17), rain_pop=0.65, aliases=("bombay",)),
    Scenario(_loc("Jaipur", "Rajasthan", "IN", 26.9124, 75.7873), IST, 20, 35, 30, 11, 300, 9, clouds_id=801),
    Scenario(_loc("Agra", "Uttar Pradesh", "IN", 27.1767, 78.0081), IST, 20, 35, 45, 8, 280, 9,
             fog_hours=(5, 6, 7), visibility=6.0),
    Scenario(_loc("Shimla", "Himachal Pradesh", "IN", 31.1048, 77.1734), IST, 9, 18, 60, 12, 225, 6,
             clouds_id=803, rain_hours=(15, 16), rain_pop=0.5, visibility=10.0),
    Scenario(_loc("Bengaluru", "Karnataka", "IN", 12.9716, 77.5946), IST, 19, 28, 65, 13, 250, 8,
             clouds_id=803, rain_hours=(16, 17, 18), rain_pop=0.55, aliases=("bangalore",)),
    Scenario(_loc("Kolkata", "West Bengal", "IN", 22.5726, 88.3639), IST, 23, 31, 74, 10, 180, 8, clouds_id=803),
    Scenario(_loc("London", "England", "GB", 51.5072, -0.1276), 0, 7, 13, 82, 24, 240, 1, clouds_id=804,
             rain_hours=(10, 11, 12, 13), rain_pop=0.6, visibility=9.0),
]


def search(query: str) -> list[Location]:
    q = query.strip().lower()
    return [
        s.location
        for s in SCENARIOS
        if q in s.location.name.lower() or any(q in a for a in s.aliases) or (s.location.state or "").lower() == q
    ]


def nearest(lat: float, lon: float) -> Scenario:
    return min(SCENARIOS, key=lambda s: (s.location.lat - lat) ** 2 + (s.location.lon - lon) ** 2)


def _temp_at(s: Scenario, hour: float) -> float:
    # Coolest around 5 AM, warmest around 3 PM.
    mid, amp = (s.tmax + s.tmin) / 2, (s.tmax - s.tmin) / 2
    return mid + amp * math.cos(2 * math.pi * (hour - 15) / 24)


def _slot(s: Scenario, ts: int, day_shift: float = 0.0) -> HourlySlot:
    hour = local_hour(ts, s.tz)
    temp = _temp_at(s, hour) + day_shift
    humidity = int(max(15, min(98, s.humidity + (s.tmax - temp) * 1.6)))
    is_day = 6 <= hour < 18
    wind = s.wind * (0.75 + 0.35 * math.sin(math.pi * (hour - 8) / 16) if 8 <= hour <= 24 else 0.7)
    uvi = round(max(0.0, s.uv_max * math.sin(math.pi * (hour - 6) / 12)), 1) if is_day else 0.0
    pop, rain, vis, cond_id = s.base_pop, 0.0, s.visibility, s.clouds_id
    if hour in s.rain_hours:
        pop, rain, cond_id = s.rain_pop, 1.4, 500
        humidity = min(98, humidity + 15)
        vis = min(vis, 5.0)
        uvi = round(uvi * 0.4, 1)
    if hour in s.fog_hours:
        cond_id, vis, humidity = 741, 0.8, min(98, humidity + 20)
    feels = temp + (0.08 * (humidity - 40) if temp > 26 else 0) - (0.06 * wind if temp < 12 else 0)
    cond = _CONDITIONS[cond_id]
    return HourlySlot(
        dt=ts,
        slot_hours=1,
        temp=round(temp, 1),
        feels_like=round(feels, 1),
        humidity=humidity,
        wind_kmh=round(wind, 1),
        wind_deg=s.wind_deg,
        pop=round(pop, 2),
        rain_mm=rain,
        visibility_km=vis,
        uvi=uvi,
        clouds={800: 0, 801: 20, 802: 45, 803: 70, 804: 95, 500: 85, 741: 60}[cond_id],
        condition=Condition(id=cond_id, main=cond[0], description=cond[1], icon=cond[2] + ("d" if is_day else "n")),
        is_day=is_day,
    )


_CONDITIONS = {
    800: ("Clear", "clear sky", "01"),
    801: ("Clouds", "mostly clear", "02"),
    802: ("Clouds", "partly cloudy", "03"),
    803: ("Clouds", "mostly cloudy", "04"),
    804: ("Clouds", "overcast", "04"),
    500: ("Rain", "light rain", "10"),
    741: ("Fog", "fog", "50"),
}


def build(location: Location) -> WeatherBundle:
    s = nearest(location.lat, location.lon)
    now = int(time.time())
    hour_start = now - (now + s.tz) % 3600  # align slots to local clock hours

    current_slot = _slot(s, now)
    hourly = [current_slot.model_copy(update={"is_now": True})]
    hourly += [_slot(s, hour_start + 3600 * i) for i in range(1, 48)]

    sunrise = hour_start - (local_hour(hour_start, s.tz) - 6) * 3600 + 1200
    current = CurrentWeather(
        dt=now,
        temp=current_slot.temp,
        feels_like=current_slot.feels_like,
        humidity=current_slot.humidity,
        wind_kmh=current_slot.wind_kmh,
        wind_deg=s.wind_deg,
        wind_dir=compass(s.wind_deg),
        uvi=current_slot.uvi,
        visibility_km=current_slot.visibility_km,
        pressure=1009,
        clouds=current_slot.clouds,
        condition=current_slot.condition,
        is_day=current_slot.is_day,
        sunrise=sunrise,
        sunset=sunrise + 11 * 3600 + 1800,
    )

    daily = []
    day0 = hour_start - local_hour(hour_start, s.tz) * 3600 + 12 * 3600
    for d in range(7):
        shift = [0, 0.8, -0.5, -1.4, 0.3, 1.1, -0.2][d]
        rain_day = bool(s.rain_hours) and d in (0, 1, 4)
        cond_id = 500 if rain_day else s.clouds_id
        cond = _CONDITIONS[cond_id]
        ts = day0 + d * 86400
        daily.append(
            DailyForecast(
                dt=ts,
                date_label=date_label(ts, s.tz),
                temp_min=round(s.tmin + shift, 1),
                temp_max=round(s.tmax + shift, 1),
                pop=s.rain_pop if rain_day else s.base_pop,
                rain_mm=4.2 if rain_day else 0.0,
                uvi=s.uv_max,
                condition=Condition(id=cond_id, main=cond[0], description=cond[1], icon=cond[2] + "d"),
            )
        )

    return WeatherBundle(
        location=location,
        current=current,
        hourly=hourly,
        daily=daily,
        alerts=[],
        meta=WeatherMeta(
            source="demo",
            provider="Mausam AI sample data",
            plan="Demo mode (no API key configured)",
            fetched_at=now,
            tz_offset=s.tz,
            unavailable=["official_alerts"],
            notes=[
                "DEMO MODE: these are generated sample values, not live weather.",
                f"Sample scenario based on {s.location.name}. Set OPENWEATHER_API_KEY for live data.",
            ],
        ),
    )
