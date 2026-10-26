"""Per-hour suitability scoring. Every penalty is recorded with a human-readable reason."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..schemas import HourlySlot
from . import rules
from .rules import ActivityProfile


@dataclass
class Factor:
    kind: str  # heat | cold | rain | wind | humidity | uv | visibility | dark | storm
    penalty: float
    text: str


@dataclass
class SlotScore:
    slot: HourlySlot
    score: float
    factors: list[Factor] = field(default_factory=list)

    @property
    def main_factor(self) -> Factor | None:
        return max(self.factors, key=lambda f: f.penalty) if self.factors else None


def score_slot(slot: HourlySlot, profile: ActivityProfile, heat_sensitivity: str = "normal") -> SlotScore:
    factors: list[Factor] = []
    ideal_max = profile.ideal_max + rules.HEAT_SENSITIVITY_SHIFT.get(heat_sensitivity, 0.0)
    fl = slot.feels_like

    if fl > ideal_max:
        factors.append(Factor("heat", (fl - ideal_max) * profile.temp_weight, f"feels like {fl:.0f}°C"))
    elif fl < profile.ideal_min:
        factors.append(Factor("cold", (profile.ideal_min - fl) * profile.temp_weight, f"feels like {fl:.0f}°C"))

    pop = slot.pop or 0.0
    rain_penalty = pop * profile.rain_weight
    if slot.rain_mm / slot.slot_hours >= rules.HEAVY_RAIN_MM_PER_HOUR:
        rain_penalty += 30
    if rain_penalty >= 5:
        factors.append(Factor("rain", rain_penalty, f"{pop * 100:.0f}% chance of rain"))

    if slot.condition.id in rules.THUNDERSTORM_CODES:
        factors.append(Factor("storm", 60, "thunderstorm risk"))

    if slot.wind_kmh > profile.wind_limit:
        factors.append(
            Factor("wind", (slot.wind_kmh - profile.wind_limit) * profile.wind_weight, f"wind {slot.wind_kmh:.0f} km/h")
        )

    if slot.humidity > 70 and fl > 24:
        factors.append(
            Factor("humidity", (slot.humidity - 70) * profile.humidity_weight, f"humid ({slot.humidity}%)")
        )

    if slot.uvi is not None and slot.uvi > 5:
        factors.append(Factor("uv", (slot.uvi - 5) * profile.uv_weight, f"UV index {slot.uvi:.0f}"))

    if slot.visibility_km is not None and slot.visibility_km < 5:
        factors.append(
            Factor(
                "visibility",
                (5 - slot.visibility_km) * profile.visibility_weight,
                f"visibility {slot.visibility_km:g} km",
            )
        )

    if not slot.is_day and profile.night_penalty:
        factors.append(Factor("dark", profile.night_penalty, "after dark"))

    factors = [f for f in factors if f.penalty >= 1]
    score = max(0.0, min(100.0, 100 - sum(f.penalty for f in factors)))
    return SlotScore(slot, round(score), sorted(factors, key=lambda f: -f.penalty))


def in_buckets(hour: int, buckets: list[str]) -> bool:
    for b in buckets:
        start, end = rules.TIME_BUCKETS[b]
        if start <= hour < end:
            return True
    return False
