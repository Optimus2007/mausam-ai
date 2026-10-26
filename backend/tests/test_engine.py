import time

from app.engine import rules
from app.engine.recommend import advisories, focus_recommendation
from app.engine.scoring import score_slot
from app.schemas import (
    Condition,
    CurrentWeather,
    HourlySlot,
    Location,
    Preferences,
    WeatherBundle,
    WeatherMeta,
)

CLEAR = Condition(id=800, main="Clear", description="clear sky", icon="01d")
RAIN = Condition(id=501, main="Rain", description="moderate rain", icon="10d")


def slot(i: int, start: int, **kw) -> HourlySlot:
    base = dict(dt=start + i * 3600, temp=22, feels_like=22, humidity=50, wind_kmh=10, pop=0.0,
                visibility_km=10, uvi=2, condition=CLEAR, is_day=True, is_now=i == 0)
    base.update(kw)
    return HourlySlot(**base)


def bundle(slots: list[HourlySlot]) -> WeatherBundle:
    s0 = slots[0]
    return WeatherBundle(
        location=Location(name="Test", lat=0, lon=0),
        current=CurrentWeather(dt=s0.dt, temp=s0.temp, feels_like=s0.feels_like, humidity=s0.humidity,
                               wind_kmh=s0.wind_kmh, condition=s0.condition, is_day=True),
        hourly=slots,
        daily=[],
        meta=WeatherMeta(source="demo", provider="test", plan="test", fetched_at=0, tz_offset=0),
    )


def _start_at_hour(h: int) -> int:
    now = int(time.time())
    day = now - now % 86400
    return day + h * 3600


def test_heat_lowers_score_and_explains_why():
    start = _start_at_hour(12)
    hot = score_slot(slot(0, start, feels_like=40, uvi=10), rules.PROFILES["fitness"])
    mild = score_slot(slot(0, start), rules.PROFILES["fitness"])
    assert hot.score < mild.score
    assert {f.kind for f in hot.factors} >= {"heat", "uv"}


def test_missing_uv_is_not_penalised():
    start = _start_at_hour(12)
    s = score_slot(slot(0, start, uvi=None), rules.PROFILES["fitness"])
    assert all(f.kind != "uv" for f in s.factors)


def test_window_respects_preferred_times():
    start = _start_at_hour(6)
    # Hot midday, pleasant early morning and evening
    slots = [slot(i, start, feels_like=38 if 10 <= 6 + i <= 16 else 22) for i in range(24)]
    rec = focus_recommendation(bundle(slots), Preferences(preferred_times=["evening"]), "fitness")
    assert rec["outdoor_ok"]
    assert 16 <= time.gmtime(rec["window"]["start"]).tm_hour < 21


def test_all_day_rain_recommends_indoors():
    start = _start_at_hour(6)
    slots = [slot(i, start, pop=1.0, rain_mm=8, condition=RAIN) for i in range(24)]
    rec = focus_recommendation(bundle(slots), Preferences(), "fitness")
    assert not rec["outdoor_ok"]
    assert rec["indoor_suggestion"]
    kinds = {a["kind"]: a for a in advisories(bundle(slots))}
    assert kinds["rain"]["severity"] == "warning"
    assert kinds["rain"]["dismissible"] is False


def test_calm_day_gives_all_clear():
    start = _start_at_hour(6)
    out = advisories(bundle([slot(i, start) for i in range(24)]))
    assert [a["kind"] for a in out] == ["clear"]
