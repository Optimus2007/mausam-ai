"""Destination planner: sightseeing/viewpoint cards, route weather and attraction accessibility."""

from __future__ import annotations

import asyncio
from collections import Counter

from ..schemas import HourlySlot, Location, Preferences, WeatherBundle
from ..weather import service
from ..weather.errors import WeatherProviderError
from ..weather.timeutil import fmt_range, fmt_time, local_dt, local_hour
from . import rules
from .destinations import Destination, Place, find, generic
from .recommend import _run, _top_reasons, advisories, find_window, next_24h, slot_end
from .scoring import SlotScore, score_slot

SIGHTSEEING_HOURS = (6, 19)

REASON_WORDS = {
    "heat": "high heat",
    "uv": "UV",
    "rain": "rain",
    "storm": "thunderstorms",
    "visibility": "low visibility",
    "wind": "strong winds",
    "humidity": "humidity",
    "cold": "cold",
}


def _daylight(tz: int):
    lo, hi = SIGHTSEEING_HOURS
    return lambda s: s.is_day and lo <= local_hour(s.dt, tz) < hi


def _day_suffix(ts: int, ref: int, tz: int) -> str:
    return " tomorrow" if local_dt(ts, tz).date() != local_dt(ref, tz).date() else ""


def _reason_text(scores: list[SlotScore]) -> str:
    kinds: Counter = Counter()
    for s in scores:
        for f in s.factors:
            if f.kind in REASON_WORDS and f.penalty >= 10:
                kinds[f.kind] += f.penalty
    words = [REASON_WORDS[k] for k, _ in kinds.most_common(2)]
    if not words:
        return ""
    text = " and ".join(words)
    return text[0].upper() + text[1:] + "."


def _card(dest: Destination, bundle: WeatherBundle, kind: str, prefs: Preferences) -> dict:
    tz = bundle.meta.tz_offset
    profile = rules.PROFILES["sightseeing" if kind == "heritage" else "viewpoint"]
    day = [s for s in next_24h(bundle) if _daylight(tz)(s)]
    scored = [score_slot(s, profile, prefs.heat_sensitivity) for s in day]
    slots = [s.slot for s in scored]
    ref = bundle.hourly[0].dt if bundle.hourly else 0

    title = dest.heritage_title if kind == "heritage" else dest.nature_title
    subtitle = dest.heritage_subtitle if kind == "heritage" else dest.nature_subtitle
    sites = dest.heritage if kind == "heritage" else dest.nature

    if not scored:
        return {
            "id": kind, "title": title, "subtitle": subtitle,
            "illustration": "fort" if kind == "heritage" else "mountain",
            "status": {"label": "NO DAYLIGHT DATA", "tone": "neutral"},
            "score": None, "avoid": None, "best_times": [], "best_note": None, "summary": "Forecast unavailable.",
            "outdoor_suitable": False, "sites": [_site(p) for p in sites], "hourly": [],
        }

    # Best windows: the top one, then the best one that doesn't overlap it.
    allow_all = lambda s: True  # noqa: E731
    best = find_window(scored, tz, allow_all, min_score=60, max_hours=3)
    windows = [best] if best else []
    if best:
        used = {s.slot.dt for s in best.scores}
        second = find_window(scored, tz, lambda s: s.dt not in used, min_score=60, max_hours=3)
        if second and abs(second.start - best.start) >= 3 * 3600:
            windows.append(second)
    windows.sort(key=lambda w: w.start)

    score_at = {s.slot.dt: s.score for s in scored}
    avoid_run = _run(slots, lambda s: score_at[s.dt] < 50)
    avoid = None
    if avoid_run:
        a, b = avoid_run
        span = scored[a : b + 1]
        avoid = {
            "label": f"{fmt_range(slots[a].dt, slot_end(slots, b), tz)}{_day_suffix(slots[a].dt, ref, tz)}",
            "reasons": _reason_text(span),
            "start": slots[a].dt,
            "end": slot_end(slots, b),
        }

    top = max(s.score for s in scored)
    main_kinds = Counter(f.kind for s in scored if s.score < 60 for f in s.factors[:1])
    main = main_kinds.most_common(1)[0][0] if main_kinds else None
    fog = any(s.slot.condition.id == 741 for s in scored if s.score < 60)

    if kind == "nature":
        if main == "visibility":
            status = {"label": "OBSCURED VIEWS" if top < rules.GOOD_SCORE or avoid else "HAZY AT TIMES", "tone": "warn"}
        elif main in ("rain", "storm"):
            status = {"label": "WET TRAILS", "tone": "warn"}
        elif top >= rules.GOOD_SCORE and not avoid:
            status = {"label": "CLEAR VIEWS", "tone": "good"}
        elif top >= rules.MODERATE_SCORE:
            status = {"label": "FAIR VIEWS", "tone": "ok"}
        else:
            status = {"label": "POOR VIEWS", "tone": "bad"}
    else:
        if top < rules.MODERATE_SCORE:
            status = {"label": "NOT RECOMMENDED", "tone": "bad"}
        elif main in ("rain", "storm") and avoid:
            status = {"label": "WET CONDITIONS", "tone": "warn"}
        elif avoid:
            status = {"label": "UNCOMFORTABLE", "tone": "warn"}
        elif top >= rules.GOOD_SCORE:
            status = {"label": "COMFORTABLE", "tone": "good"}
        else:
            status = {"label": "MANAGEABLE", "tone": "ok"}

    if kind == "nature" and main == "visibility":
        when = ""
        if avoid_run:
            h = local_hour(slots[avoid_run[0]].dt, tz)
            when = " in the morning" if h < 11 else " in the afternoon" if h < 16 else " this evening"
        summary = f"Low visibility{when}" + (" due to fog." if fog else " due to haze or rain.")
    elif avoid:
        summary = avoid["reasons"] or "Less comfortable at times."
    else:
        summary = "Comfortable conditions through the day." if top >= rules.GOOD_SCORE else "Acceptable, with some limits."

    best_times = [
        f"{w.label()}{_day_suffix(w.start, ref, tz)}" for w in windows
    ]
    best_note = None
    if kind == "nature" and best and best.avg < rules.GOOD_SCORE:
        best_note = "Partial clarity predicted."
    elif best and best.scores and best.scores[0].factors and best.scores[0].factors[0].penalty >= 10:
        best_note = f"Watch for {best.scores[0].factors[0].text}."

    pick = sites[0].name if sites else title
    return {
        "id": kind,
        "title": title,
        "subtitle": subtitle,
        "illustration": "fort" if kind == "heritage" else "mountain",
        "status": status,
        "score": round(best.avg) if best else top,
        "avoid": avoid,
        "best_times": best_times,
        "best_note": best_note,
        "summary": summary,
        "outdoor_suitable": top >= rules.MODERATE_SCORE,
        "suggestion": {"title": pick, "time_label": best_times[0] if best_times else None},
        "sites": [_site(p) for p in sites],
        "hourly": [
            {"dt": s.slot.dt, "label": "Now" if s.slot.is_now else fmt_time(s.slot.dt, tz), "score": s.score,
             "reasons": [f.text for f in s.factors[:2]]}
            for s in scored
        ],
    }


def _site(p: Place) -> dict:
    return {"name": p.name, "note": p.note, "lat": p.lat, "lon": p.lon}


def _slot_brief(s: HourlySlot, tz: int) -> dict:
    return {
        "dt": s.dt,
        "label": "Now" if s.is_now else fmt_time(s.dt, tz),
        "temp": s.temp,
        "pop": s.pop,
        "visibility_km": s.visibility_km,
        "wind_kmh": s.wind_kmh,
        "condition": s.condition.model_dump(),
    }


def _route_risk(slots: list[HourlySlot]) -> tuple[int, list[str]]:
    pts, why = 0, []
    vis = [s.visibility_km for s in slots if s.visibility_km is not None]
    if vis:
        v = min(vis)
        if v < rules.VISIBILITY_FOG_KM:
            pts, why = pts + 3, why + ["fog"]
        elif v < rules.VISIBILITY_POOR_KM:
            pts, why = pts + 2, why + ["low visibility"]
        elif v < 5:
            pts, why = pts + 1, why + ["haze"]
    pop = max((s.pop or 0) for s in slots)
    if any(s.rain_mm / s.slot_hours >= rules.HEAVY_RAIN_MM_PER_HOUR for s in slots):
        pts, why = pts + 3, why + ["heavy rain"]
    elif pop >= 0.7:
        pts, why = pts + 2, why + ["rain"]
    elif pop >= 0.4:
        pts, why = pts + 1, why + ["showers"]
    wind = max(s.wind_kmh for s in slots)
    if wind >= rules.WIND_DANGER_KMH:
        pts, why = pts + 2, why + ["strong winds"]
    elif wind >= rules.WIND_CAUTION_KMH:
        pts, why = pts + 1, why + ["gusty winds"]
    if any(s.condition.id in rules.THUNDERSTORM_CODES for s in slots):
        pts, why = pts + 3, why + ["thunderstorms"]
    return pts, why


def _risk_label(pts: int) -> dict:
    if pts >= 3:
        return {"label": "HIGH RISK", "tone": "bad"}
    if pts >= 1:
        return {"label": "MODERATE RISK", "tone": "warn"}
    return {"label": "LOW RISK", "tone": "good"}


async def _route(dest: Destination) -> dict | None:
    if not dest.route:
        return None
    bundles = await asyncio.gather(
        *[service.get_weather(Location(name=p.name, lat=p.lat, lon=p.lon)) for p in dest.route],
        return_exceptions=True,
    )
    segments, worst = [], (-1, None, None)
    for p, b in zip(dest.route, bundles):
        if isinstance(b, Exception):
            segments.append({"name": p.name, "note": p.note, "error": "Weather unavailable for this point"})
            continue
        tz = b.meta.tz_offset
        window = [s for s in b.hourly if s.dt < b.hourly[0].dt + 12 * 3600]
        pts, why = _route_risk(window)
        fog_run = _run(window, lambda s: s.visibility_km is not None and s.visibility_km < rules.VISIBILITY_POOR_KM)
        wet_run = _run(window, lambda s: (s.pop or 0) >= 0.4)
        seg = {
            "name": p.name,
            "note": p.note,
            "risk": _risk_label(pts),
            "factors": why,
            "min_visibility_km": min((s.visibility_km for s in window if s.visibility_km is not None), default=None),
            "max_pop": max((s.pop or 0) for s in window),
            "max_wind_kmh": max(s.wind_kmh for s in window),
            "fog_window": f"{fmt_time(window[fog_run[0]].dt, tz, True)} – {fmt_time(slot_end(window, fog_run[1]), tz, True)}" if fog_run else None,
            "rain_window": f"{fmt_time(window[wet_run[0]].dt, tz)} – {fmt_time(slot_end(window, wet_run[1]), tz)}" if wet_run else None,
            "hourly": [_slot_brief(s, tz) for s in window],
        }
        segments.append(seg)
        if pts > worst[0]:
            worst = (pts, seg, why)

    if worst[1] is None:
        return {"name": dest.route_name, "label": dest.route_label, "risk": {"label": "UNAVAILABLE", "tone": "neutral"},
                "summary": "Route weather could not be loaded.", "advice": None, "segments": segments}

    pts, seg, why = worst
    if seg["fog_window"]:
        summary = f"{'Patchy fog' if 'fog' in why else 'Haze'} on {dest.route_name}. Low visibility between {seg['fog_window']} near {seg['name']}."
        advice = "Reduced speed recommended. Use low-beam lights."
    elif seg["rain_window"]:
        summary = f"Rain possible near {seg['name']} between {seg['rain_window']}."
        advice = "Allow extra travel time and keep a safe braking distance."
    elif pts:
        summary = f"{why[0].capitalize()} expected near {seg['name']}."
        advice = "Drive with care."
    else:
        summary = f"Clear driving conditions expected on {dest.route_name} for the next 12 hours."
        advice = None
    return {
        "name": dest.route_name, "label": dest.route_label, "risk": _risk_label(pts),
        "summary": summary, "advice": advice, "segments": segments,
    }


async def _accessibility(dest: Destination, city_bundle: WeatherBundle) -> dict | None:
    site = dest.access_site
    if not site:
        return None
    bundle = city_bundle
    if abs(site.lat - city_bundle.location.lat) > 0.25 or abs(site.lon - city_bundle.location.lon) > 0.25:
        try:
            bundle = await service.get_weather(Location(name=site.name, lat=site.lat, lon=site.lon))
        except WeatherProviderError:
            bundle = city_bundle
    tz = bundle.meta.tz_offset
    day = [s for s in next_24h(bundle) if _daylight(tz)(s)] or next_24h(bundle)
    if not day:
        return None

    pts, notes = 0, []
    pop = max((s.pop or 0) for s in day)
    if any(s.condition.id in rules.THUNDERSTORM_CODES for s in day):
        pts, notes = pts + 3, notes + ["Thunderstorms forecast — open-air areas may be closed temporarily."]
    if any(s.rain_mm / s.slot_hours >= rules.HEAVY_RAIN_MM_PER_HOUR for s in day):
        pts, notes = pts + 3, notes + ["Heavy rain may make paths slippery or waterlogged."]
    elif pop >= rules.RAIN_LIKELY_POP:
        pts, notes = pts + 2, notes + ["Rain likely — carry an umbrella and expect wet surfaces."]
    elif pop >= 0.15:
        pts, notes = pts + 1, notes + ["Safe, but carry an umbrella. Light rain shower possible."]
    hot = max(s.feels_like for s in day)
    if hot >= rules.HEAT_DANGER_FEELS_LIKE:
        pts, notes = pts + 2, notes + [f"Feels like {hot:.0f}°C at peak — visit early or late."]
    elif hot >= rules.HEAT_CAUTION_FEELS_LIKE:
        pts, notes = pts + 1, notes + [f"Hot at midday (feels like {hot:.0f}°C) — carry water."]
    wind = max(s.wind_kmh for s in day)
    if wind >= rules.WIND_DANGER_KMH:
        pts, notes = pts + 2, notes + ["Strong winds — ferries and elevated areas may be restricted."]

    if pts >= 5:
        status = {"label": "NOT ADVISED", "tone": "bad"}
    elif pts >= 3:
        status = {"label": "LIMITED", "tone": "warn"}
    elif pts >= 1:
        status = {"label": "ACCESSIBLE (MOSTLY)", "tone": "ok"}
    else:
        status = {"label": "ACCESSIBLE", "tone": "good"}

    cond = Counter(s.condition.description for s in day).most_common(1)[0][0]
    return {
        "site": site.name,
        "note": site.note,
        "status": status,
        "conditions": f"{cond.capitalize()}, {pop * 100:.0f}% rain chance",
        "advice": " ".join(notes) or "No weather barriers expected during visiting hours.",
        "disclaimer": "Weather-based prediction only. Check official timings and closures before visiting.",
        "hourly": [_slot_brief(s, tz) for s in day],
    }


async def build_plan(bundle: WeatherBundle, prefs: Preferences) -> dict:
    dest = find(bundle.location) or generic(bundle.location)
    heritage = _card(dest, bundle, "heritage", prefs)
    nature = _card(dest, bundle, "nature", prefs)
    route, access = await asyncio.gather(_route(dest), _accessibility(dest, bundle))
    outdoor_ok = heritage["outdoor_suitable"] or nature["outdoor_suitable"]
    return {
        "location": bundle.location.model_dump(),
        "source": bundle.meta.source,
        "generated_at": bundle.meta.fetched_at,
        "destination": {"tagline": dest.tagline, "landmark": dest.landmark, "curated": bool(dest.heritage)},
        "current": {
            "temp": bundle.current.temp,
            "condition": bundle.current.condition.model_dump(),
            "is_day": bundle.current.is_day,
        },
        "cards": [heritage, nature],
        "indoor_alternatives": {
            "recommended": not outdoor_ok,
            "items": [{"name": i.name, "kind": i.kind, "note": i.note} for i in dest.indoor],
        },
        "insights": {"route": route, "accessibility": access},
        "advisories": advisories(bundle),
        "disclaimer": "Forecast data from the weather provider; suitability and risk labels are Mausam AI recommendations, not official advisories.",
    }
