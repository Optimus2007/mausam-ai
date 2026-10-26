"""Turns a WeatherBundle + user preferences into activity windows, suitability scores and advisories."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

from ..schemas import HourlySlot, Preferences, WeatherBundle
from ..weather.timeutil import fmt_hour_range, fmt_range, fmt_time, local_hour
from . import rules
from .scoring import SlotScore, in_buckets, score_slot

HEADLINES = {
    "fitness": "Best outdoor workout window",
    "travel": "Best time to head out",
    "gardening": "Best gardening window",
    "family": "Best family outing window",
    "sightseeing": "Best sightseeing window",
    "viewpoint": "Best viewing window",
}

ACTIVITY_HINTS = {
    "fitness": "Good time for a run, cycle or outdoor workout.",
    "travel": "Roads and skies look manageable for travel.",
    "gardening": "Good time for planting, pruning and watering.",
    "family": "Comfortable for parks and outdoor family time.",
}


@dataclass
class Window:
    scores: list[SlotScore]
    start: int
    end: int
    tz: int

    @property
    def avg(self) -> float:
        return mean(s.score for s in self.scores)

    @property
    def hours(self) -> float:
        return (self.end - self.start) / 3600

    def label(self) -> str:
        if self.scores[0].slot.is_now:
            return f"Now – {fmt_time(self.end, self.tz, minutes=True)}"
        return fmt_range(self.start, self.end, self.tz)


def next_24h(bundle: WeatherBundle) -> list[HourlySlot]:
    if not bundle.hourly:
        return []
    horizon = bundle.hourly[0].dt + 24 * 3600
    return [s for s in bundle.hourly if s.dt < horizon]


def slot_end(slots: list[HourlySlot], i: int) -> int:
    end = slots[i].dt + slots[i].slot_hours * 3600
    if i + 1 < len(slots):
        end = min(end, slots[i + 1].dt)
    return end


def find_window(
    scored: list[SlotScore],
    tz: int,
    allowed,
    min_score: float = rules.WINDOW_MIN_SCORE,
    max_hours: float = rules.WINDOW_MAX_HOURS,
) -> Window | None:
    """Best contiguous run of allowed slots that all clear `min_score`, capped at `max_hours`."""
    slots = [s.slot for s in scored]
    best: tuple[float, Window] | None = None
    for i in range(len(scored)):
        if not allowed(slots[i]) or scored[i].score < min_score:
            continue
        j = i
        while True:
            w = Window(scored[i : j + 1], slots[i].dt, slot_end(slots, j), tz)
            value = w.avg + 4 * min(w.hours, 2)
            if best is None or value > best[0] + 0.01:
                best = (value, w)
            nxt = j + 1
            if (
                nxt >= len(scored)
                or not allowed(slots[nxt])
                or scored[nxt].score < min_score
                or (slot_end(slots, nxt) - slots[i].dt) / 3600 > max_hours
            ):
                break
            j = nxt
    return best[1] if best else None


def waking(tz: int):
    lo, hi = rules.WAKING_HOURS
    return lambda s: s.is_now or lo <= local_hour(s.dt, tz) < hi


def preferred(tz: int, buckets: list[str]):
    wake = waking(tz)
    return lambda s: wake(s) and (not buckets or in_buckets(local_hour(s.dt, tz), buckets))


def explain_window(w: Window, day_slots: list[HourlySlot]) -> tuple[str, list[str]]:
    slots = [s.slot for s in w.scores]
    hum = mean(s.humidity for s in slots)
    day_hum = mean(s.humidity for s in day_slots) if day_slots else hum
    wind = mean(s.wind_kmh for s in slots)
    pop = max((s.pop or 0) for s in slots)
    feels = [s.feels_like for s in slots]
    uvs = [s.uvi for s in slots if s.uvi is not None]

    lead = "Pleasant weather" if w.avg >= 85 else "Comfortable conditions" if w.avg >= rules.GOOD_SCORE else "Workable conditions"
    parts = []
    if hum < day_hum - 4:
        parts.append("lower humidity")
    elif hum <= 55:
        parts.append("low humidity")
    if 6 <= wind <= 20:
        parts.append("a comfortable breeze")
    elif wind < 6:
        parts.append("calm winds")
    else:
        parts.append("a brisk breeze")
    if pop < 0.2:
        parts.append("dry skies")
    if uvs and max(uvs) <= 3 and any(s.is_day for s in slots):
        parts.append("low UV")
    text = lead + (" with " + _join(parts[:3]) if parts else "") + "."

    facts = [
        f"Feels like {min(feels):.0f}–{max(feels):.0f}°C" if round(min(feels)) != round(max(feels)) else f"Feels like {feels[0]:.0f}°C",
        f"Humidity {hum:.0f}%",
        f"Wind {wind:.0f} km/h",
        f"Rain chance {pop * 100:.0f}%",
    ]
    if uvs:
        facts.append(f"UV {max(uvs):.0f}")
    return text, facts


def _join(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def _top_reasons(scores: list[SlotScore], limit: int = 2) -> list[str]:
    seen: dict[str, tuple[float, str]] = {}
    for s in scores:
        for f in s.factors:
            if f.kind == "dark":
                continue
            if f.kind not in seen or f.penalty > seen[f.kind][0]:
                seen[f.kind] = (f.penalty, f.text)
    return [t for _, t in sorted(seen.values(), key=lambda x: -x[0])[:limit]]


def focus_recommendation(bundle: WeatherBundle, prefs: Preferences, activity: str) -> dict:
    tz = bundle.meta.tz_offset
    profile = rules.PROFILES[activity]
    day = next_24h(bundle)
    scored = [score_slot(s, profile, prefs.heat_sensitivity) for s in day]

    outside_preferred = False
    w = find_window(scored, tz, preferred(tz, prefs.preferred_times))
    if w is None:
        w = find_window(scored, tz, waking(tz))
        outside_preferred = w is not None and bool(prefs.preferred_times)

    if w:
        explanation, facts = explain_window(w, day)
        return {
            "activity": activity,
            "outdoor_ok": True,
            "headline": HEADLINES[activity],
            "window": {"label": w.label(), "start": w.start, "end": w.end, "score": round(w.avg)},
            "explanation": explanation,
            "hint": ACTIVITY_HINTS.get(activity),
            "facts": facts,
            "outside_preferred": outside_preferred,
            "indoor_suggestion": None,
        }

    awake = [s for s in scored if waking(tz)(s.slot)] or scored
    reasons = _top_reasons(awake)
    return {
        "activity": activity,
        "outdoor_ok": False,
        "headline": "Better indoors today",
        "window": None,
        "explanation": "No outdoor window in the next 24 hours meets the comfort threshold"
        + (f" ({_join(reasons)})." if reasons else "."),
        "hint": None,
        "facts": [f"Comfort threshold: score {rules.WINDOW_MIN_SCORE}+"],
        "outside_preferred": False,
        "indoor_suggestion": profile.indoor_alternative,
    }


def activity_suitability(bundle: WeatherBundle, prefs: Preferences) -> list[dict]:
    tz = bundle.meta.tz_offset
    day = next_24h(bundle)
    out = []
    for act in ["fitness", "travel", "gardening", "family"]:
        profile = rules.PROFILES[act]
        scored = [score_slot(s, profile, prefs.heat_sensitivity) for s in day]
        awake = [s for s in scored if waking(tz)(s.slot)] or scored
        w = find_window(scored, tz, waking(tz), min_score=0, max_hours=2)
        # Blend the best window with the whole waking day so the score reflects both "can I fit it in" and "how is the day overall".
        day_avg = mean(s.score for s in awake)
        score = round(0.5 * (w.avg if w else max(s.score for s in awake)) + 0.5 * day_avg)
        out.append(
            {
                "id": act,
                "name": profile.name,
                "score": score,
                "label": rules.label_for(score),
                "best_time": w.label() if w else None,
                "now_score": scored[0].score if scored else None,
                "now_label": rules.label_for(scored[0].score) if scored else None,
                "limits": _top_reasons(awake, 3),
                "enabled": act in prefs.activities,
                "indoor_alternative": profile.indoor_alternative,
                "hourly": [
                    {
                        "dt": s.slot.dt,
                        "label": "Now" if s.slot.is_now else fmt_time(s.slot.dt, tz),
                        "score": s.score,
                        "reasons": [f.text for f in s.factors[:2]],
                    }
                    for s in scored
                ],
            }
        )
    return out


# ---------------------------------------------------------------- advisories


def _run(slots: list[HourlySlot], pred) -> tuple[int, int] | None:
    """First contiguous run of slots matching pred → (start index, end index)."""
    start = None
    for i, s in enumerate(slots):
        if pred(s):
            if start is None:
                start = i
        elif start is not None:
            return start, i - 1
    return (start, len(slots) - 1) if start is not None else None


def _when(slots: list[HourlySlot], run: tuple[int, int], tz: int) -> str:
    a, b = run
    if slots[a].is_now and b == a:
        return "now"
    start = "now" if slots[a].is_now else fmt_time(slots[a].dt, tz)
    return f"{start} – {fmt_time(slot_end(slots, b), tz)}"


def advisories(bundle: WeatherBundle) -> list[dict]:
    tz = bundle.meta.tz_offset
    day = next_24h(bundle)
    if not day:
        return []
    out: list[dict] = []
    loc_key = f"{bundle.location.lat:.2f},{bundle.location.lon:.2f}"

    def add(kind, severity, title, message, basis, run=None, icon=None):
        start_dt = day[run[0]].dt if run else day[0].dt
        out.append(
            {
                "id": f"{kind}:{loc_key}:{start_dt // 3600}",
                "kind": kind,
                "severity": severity,
                "title": title,
                "message": message,
                "basis": basis,
                "time_label": _when(day, run, tz) if run else None,
                "dismissible": severity != "warning",
                "icon": icon or kind,
            }
        )

    # Thunderstorms
    run = _run(day, lambda s: s.condition.id in rules.THUNDERSTORM_CODES)
    if run:
        add("storm", "warning", f"Thunderstorm risk {_when(day, run, tz)}",
            "Avoid open grounds and tall trees; stay indoors during lightning.",
            "Forecast condition: thunderstorm", run)

    # Rain
    def wet(s: HourlySlot) -> bool:
        return (s.pop or 0) >= rules.RAIN_LIKELY_POP or s.rain_mm / s.slot_hours >= 0.5

    run = _run(day, wet)
    if run:
        s0 = day[run[0]]
        heavy = any(s.rain_mm / s.slot_hours >= rules.HEAVY_RAIN_MM_PER_HOUR for s in day[run[0] : run[1] + 1])
        peak = max((s.pop or 0) for s in day[run[0] : run[1] + 1])
        title = ("Heavy rain" if heavy else "Rain likely") + (" now" if s0.is_now else f" after {fmt_time(s0.dt, tz)}")
        add("rain", "warning" if heavy else "caution", title,
            "Carry an umbrella and stay prepared!" if not heavy else "Avoid low-lying roads; expect waterlogging and delays.",
            f"Up to {peak * 100:.0f}% chance of rain (alert threshold {rules.RAIN_LIKELY_POP * 100:.0f}%)", run)
    else:
        run = _run(day, lambda s: (s.pop or 0) >= rules.RAIN_POSSIBLE_POP)
        if run:
            peak = max((s.pop or 0) for s in day[run[0] : run[1] + 1])
            add("rain", "info", f"Slight chance of rain {_when(day, run, tz)}",
                "A compact umbrella is a good idea.", f"Up to {peak * 100:.0f}% chance of rain", run)

    # Heat
    hot = max(s.feels_like for s in day)
    if hot >= rules.HEAT_DANGER_FEELS_LIKE:
        run = _run(day, lambda s: s.feels_like >= rules.HEAT_DANGER_FEELS_LIKE)
        add("heat", "warning", f"Extreme heat {_when(day, run, tz)}",
            "Avoid strenuous outdoor activity, drink water regularly and stay in shade.",
            f"Feels like up to {hot:.0f}°C (threshold {rules.HEAT_DANGER_FEELS_LIKE:.0f}°C)", run)
    elif hot >= rules.HEAT_CAUTION_FEELS_LIKE:
        run = _run(day, lambda s: s.feels_like >= rules.HEAT_CAUTION_FEELS_LIKE)
        add("heat", "caution", f"High heat {_when(day, run, tz)}",
            "Keep outdoor exertion short and stay hydrated.",
            f"Feels like up to {hot:.0f}°C (threshold {rules.HEAT_CAUTION_FEELS_LIKE:.0f}°C)", run)

    # UV (only if provided by the data source)
    uvs = [s.uvi for s in day if s.uvi is not None]
    if uvs and max(uvs) >= rules.UV_HIGH:
        very = max(uvs) >= rules.UV_VERY_HIGH
        limit = rules.UV_VERY_HIGH if very else rules.UV_HIGH
        run = _run(day, lambda s: (s.uvi or 0) >= limit)
        add("uv", "caution" if very else "info", f"{'Very high' if very else 'High'} UV {_when(day, run, tz)}",
            "Use sunscreen, sunglasses and a hat; seek shade around midday.",
            f"Peak UV index {max(uvs):.0f}", run)

    # Wind
    windy = max(s.wind_kmh for s in day)
    if windy >= rules.WIND_CAUTION_KMH:
        danger = windy >= rules.WIND_DANGER_KMH
        limit = rules.WIND_DANGER_KMH if danger else rules.WIND_CAUTION_KMH
        run = _run(day, lambda s: s.wind_kmh >= limit)
        add("wind", "warning" if danger else "caution", f"Strong winds {_when(day, run, tz)}",
            "Secure loose objects; take care cycling and on two-wheelers.",
            f"Wind up to {windy:.0f} km/h (threshold {limit:.0f} km/h)", run)

    # Visibility
    vis = [s.visibility_km for s in day if s.visibility_km is not None]
    if vis and min(vis) < rules.VISIBILITY_POOR_KM:
        fog = min(vis) < rules.VISIBILITY_FOG_KM
        limit = rules.VISIBILITY_FOG_KM if fog else rules.VISIBILITY_POOR_KM
        run = _run(day, lambda s: s.visibility_km is not None and s.visibility_km < limit)
        add("visibility", "caution", f"{'Dense fog' if fog else 'Low visibility'} {_when(day, run, tz)}",
            "Drive slowly with low-beam lights and keep extra distance.",
            f"Visibility down to {min(vis):g} km", run)

    # Cold
    cold = min(s.temp for s in day)
    if cold <= rules.COLD_CAUTION_TEMP:
        run = _run(day, lambda s: s.temp <= rules.COLD_CAUTION_TEMP)
        add("cold", "caution", f"Cold {_when(day, run, tz)}", "Layer up, especially early morning and late night.",
            f"Low of {cold:.0f}°C", run)

    order = {"warning": 0, "caution": 1, "info": 2}
    out.sort(key=lambda a: order[a["severity"]])
    if not out:
        out.append(
            {
                "id": f"clear:{loc_key}:{day[0].dt // 86400}",
                "kind": "clear",
                "severity": "ok",
                "title": "No weather concerns in the next 24 hours",
                "message": "Conditions look steady — enjoy your day.",
                "basis": "No configured thresholds are exceeded in the forecast",
                "time_label": None,
                "dismissible": True,
                "icon": "clear",
            }
        )
    return out


def build_recommendations(bundle: WeatherBundle, prefs: Preferences) -> dict:
    return {
        "location": bundle.location.model_dump(),
        "source": bundle.meta.source,
        "generated_at": bundle.meta.fetched_at,
        "focus": focus_recommendation(bundle, prefs, prefs.focus_activity),
        "activities": activity_suitability(bundle, prefs),
        "advisories": advisories(bundle),
        "official_alerts": [a.model_dump() for a in bundle.alerts],
        "rules_version": rules.RULES_VERSION,
        "disclaimer": "Recommendations are generated by Mausam AI from forecast data and are not official weather warnings.",
        "time_range_label": fmt_hour_range(bundle.hourly[0].dt, bundle.hourly[0].dt + 24 * 3600, bundle.meta.tz_offset)
        if bundle.hourly
        else None,
    }
