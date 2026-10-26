"""Transparent, configurable thresholds for every safety-relevant recommendation.

Edit the numbers here to tune Mausam AI. Each threshold is referenced by name in the
`basis` text shown to users, so it is always clear why a recommendation was made.
"""

from __future__ import annotations

from dataclasses import dataclass

RULES_VERSION = "2026.10-1"

# --- Safety thresholds (used for advisories) -------------------------------------
HEAT_CAUTION_FEELS_LIKE = 35.0  # °C, "very warm" — limit strenuous activity
HEAT_DANGER_FEELS_LIKE = 41.0  # °C, heat stress risk
COLD_CAUTION_TEMP = 5.0  # °C
RAIN_LIKELY_POP = 0.5  # probability that counts as "rain likely"
RAIN_POSSIBLE_POP = 0.3
HEAVY_RAIN_MM_PER_HOUR = 7.5
WIND_CAUTION_KMH = 30.0
WIND_DANGER_KMH = 50.0
UV_HIGH = 6.0  # WHO scale: 6–7 high, 8–10 very high, 11+ extreme
UV_VERY_HIGH = 8.0
VISIBILITY_POOR_KM = 2.0
VISIBILITY_FOG_KM = 1.0
THUNDERSTORM_CODES = range(200, 300)

# --- Scoring --------------------------------------------------------------------
GOOD_SCORE = 75
MODERATE_SCORE = 55
POOR_SCORE = 35
WINDOW_MIN_SCORE = 65  # minimum score for an hour to be part of a recommended window
WINDOW_MAX_HOURS = 3
WAKING_HOURS = (5, 22)  # local hours considered for outdoor plans

TIME_BUCKETS = {
    "morning": (5, 11),
    "midday": (11, 16),
    "evening": (16, 21),
    "night": (21, 24),
}

HEAT_SENSITIVITY_SHIFT = {"low": 2.0, "normal": 0.0, "high": -3.0}  # shifts the ideal max temperature


@dataclass(frozen=True)
class ActivityProfile:
    id: str
    name: str
    ideal_min: float  # feels-like °C
    ideal_max: float
    temp_weight: float  # points lost per °C outside the ideal range
    rain_weight: float  # points lost at 100% rain probability
    wind_limit: float  # km/h before penalties start
    wind_weight: float  # points per km/h above limit
    humidity_weight: float  # points per % above 70% when warm
    uv_weight: float  # points per UV unit above 5
    visibility_weight: float  # points per km below 5 km
    night_penalty: float  # points lost in darkness
    indoor_alternative: str


PROFILES: dict[str, ActivityProfile] = {
    "fitness": ActivityProfile(
        "fitness", "Fitness", 10, 27, 4.0, 45, 25, 1.2, 0.6, 5.0, 2.0, 8,
        "Switch to an indoor workout — gym, yoga or a home HIIT session.",
    ),
    "travel": ActivityProfile(
        "travel", "Travel", 5, 34, 1.5, 35, 35, 1.5, 0.2, 2.0, 7.0, 6,
        "Keep extra buffer time, prefer daylight driving and check road updates before leaving.",
    ),
    "gardening": ActivityProfile(
        "gardening", "Gardening", 12, 30, 3.0, 40, 30, 1.0, 0.3, 4.0, 0.5, 30,
        "Do indoor plant care and repotting; postpone outdoor planting and spraying.",
    ),
    "family": ActivityProfile(
        "family", "Family", 15, 31, 3.0, 50, 28, 1.3, 0.4, 4.0, 1.5, 15,
        "Plan an indoor outing — a museum, science centre, library or play area.",
    ),
    # Planner-only profiles
    "sightseeing": ActivityProfile(
        "sightseeing", "Sightseeing", 12, 31, 4.5, 45, 35, 1.0, 0.4, 6.0, 1.5, 35,
        "Visit museums and covered heritage galleries instead.",
    ),
    "viewpoint": ActivityProfile(
        "viewpoint", "Viewpoints", 5, 33, 1.5, 40, 30, 1.5, 0.2, 2.0, 12.0, 45,
        "Try alternative spots with closer views, or go later when visibility improves.",
    ),
}


def label_for(score: float) -> str:
    if score >= GOOD_SCORE:
        return "Good"
    if score >= MODERATE_SCORE:
        return "Moderate"
    if score >= POOR_SCORE:
        return "Poor"
    return "Unsuitable"
