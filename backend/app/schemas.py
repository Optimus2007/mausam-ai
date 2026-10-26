"""Normalized data models shared by the weather providers, the engine and the API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DataSource = Literal["live", "demo"]
ActivityId = Literal["fitness", "travel", "gardening", "family"]
TimeOfDay = Literal["morning", "midday", "evening", "night"]


class Location(BaseModel):
    name: str
    state: str | None = None
    country: str | None = None
    lat: float
    lon: float


class Condition(BaseModel):
    id: int  # OpenWeather condition code (2xx thunder, 3xx drizzle, 5xx rain, 6xx snow, 7xx atmosphere, 800 clear, 80x clouds)
    main: str
    description: str
    icon: str  # OpenWeather icon code, e.g. "02d"


class CurrentWeather(BaseModel):
    dt: int
    temp: float
    feels_like: float
    humidity: int
    wind_kmh: float
    wind_deg: int | None = None
    wind_dir: str | None = None
    uvi: float | None = None  # only available with One Call 3.0
    visibility_km: float | None = None
    pressure: int | None = None
    clouds: int | None = None
    condition: Condition
    is_day: bool
    sunrise: int | None = None
    sunset: int | None = None


class HourlySlot(BaseModel):
    dt: int
    slot_hours: int = 1  # 1 for One Call hourly data, 3 for the free 5-day/3-hour forecast
    temp: float
    feels_like: float
    humidity: int
    wind_kmh: float
    wind_deg: int | None = None
    pop: float | None = None  # probability of precipitation 0..1
    rain_mm: float = 0.0
    snow_mm: float = 0.0
    visibility_km: float | None = None
    uvi: float | None = None
    clouds: int | None = None
    condition: Condition
    is_day: bool
    is_now: bool = False


class DailyForecast(BaseModel):
    dt: int
    date_label: str
    temp_min: float
    temp_max: float
    pop: float | None = None
    rain_mm: float = 0.0
    uvi: float | None = None
    condition: Condition
    sunrise: int | None = None
    sunset: int | None = None
    derived: bool = False  # True when aggregated from 3-hour forecast data


class OfficialAlert(BaseModel):
    sender: str
    event: str
    start: int
    end: int
    description: str


class WeatherMeta(BaseModel):
    source: DataSource
    provider: str
    plan: str
    fetched_at: int
    tz_offset: int  # seconds east of UTC for the location
    unavailable: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class WeatherBundle(BaseModel):
    location: Location
    current: CurrentWeather
    hourly: list[HourlySlot]
    daily: list[DailyForecast]
    alerts: list[OfficialAlert] = Field(default_factory=list)
    meta: WeatherMeta


class Preferences(BaseModel):
    activities: list[ActivityId] = Field(default_factory=lambda: ["fitness", "travel", "gardening", "family"])
    focus_activity: ActivityId = "fitness"
    preferred_times: list[TimeOfDay] = Field(default_factory=lambda: ["morning", "evening"])
    heat_sensitivity: Literal["low", "normal", "high"] = "normal"


class LocationQuery(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    name: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=8)


class RecommendationRequest(LocationQuery):
    preferences: Preferences = Field(default_factory=Preferences)


class PlannerRequest(LocationQuery):
    preferences: Preferences = Field(default_factory=Preferences)
