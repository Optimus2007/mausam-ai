"""Helpers for formatting unix timestamps in a location's local time."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def local_dt(ts: int, tz_offset: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone(timedelta(seconds=tz_offset)))


def fmt_time(ts: int, tz_offset: int, minutes: bool = False) -> str:
    """6 PM / 6:00 PM."""
    d = local_dt(ts, tz_offset)
    hour = d.hour % 12 or 12
    suffix = "AM" if d.hour < 12 else "PM"
    return f"{hour}:{d.minute:02d} {suffix}" if minutes else f"{hour} {suffix}"


def fmt_range(start: int, end: int, tz_offset: int) -> str:
    """6:00 – 8:00 PM, or 11:00 AM – 1:00 PM."""
    s, e = local_dt(start, tz_offset), local_dt(end, tz_offset)
    s_suffix = "AM" if s.hour < 12 else "PM"
    e_suffix = "AM" if e.hour < 12 else "PM"
    s_txt = f"{s.hour % 12 or 12}:{s.minute:02d}"
    e_txt = f"{e.hour % 12 or 12}:{e.minute:02d} {e_suffix}"
    return f"{s_txt} – {e_txt}" if s_suffix == e_suffix else f"{s_txt} {s_suffix} – {e_txt}"


def fmt_hour_range(start: int, end: int, tz_offset: int) -> str:
    """1 PM – 4 PM style for compact copy."""
    return f"{fmt_time(start, tz_offset)} – {fmt_time(end, tz_offset)}"


def local_hour(ts: int, tz_offset: int) -> int:
    return local_dt(ts, tz_offset).hour


def date_label(ts: int, tz_offset: int) -> str:
    return local_dt(ts, tz_offset).strftime("%a, %d %b")


def compass(deg: int | None) -> str | None:
    if deg is None:
        return None
    return COMPASS[int((deg % 360) / 45 + 0.5) % 8]
